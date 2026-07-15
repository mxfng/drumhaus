/**
 * AudioEngine facade.
 *
 * A single class owning every Tone.js object: instrument channels, the
 * master bus, the live sequence, and chain playback state. The app pushes
 * state snapshots in via a narrow command API in domain units; the scheduler
 * reads engine-owned copies only. Nothing here (or anywhere under engine/)
 * imports React, Zustand, or anything from features/ or shared/ - store
 * wiring and knob-to-domain mapping happen at the boundary in
 * core/audio/bridge and core/audio/hooks.
 *
 * Events flow the other way: playback-variation changes and kit loads are
 * emitted to listeners so the UI can mirror engine state.
 */

import {
  getContext,
  getDestination,
  getTransport,
  Meter,
  Offline,
  Sequence,
} from "tone/build/esm/index";

import {
  prepareSampleSourceResolver,
  SampleSourceResolver,
} from "../cache/sample";
import {
  EXPORT_CHANNEL_COUNT,
  EXPORT_PREROLL_TIME,
  EXPORT_TAIL_TIME,
  STEP_COUNT,
  TRANSPORT_SWING_MAX,
} from "./constants";
import {
  ensureAudioContextIsRunning,
  getAudioContextHealth,
  type AudioContextHealth,
} from "./context/manager";
import {
  InstrumentChannel,
  triggerAllInstrumentsReleaseAtTime,
} from "./instrument-channel";
import type {
  ChannelPlayParams,
  ContinuousRuntimeParams,
  InstrumentRole,
} from "./instrument/types";
import { MasterBus, MasterChainSettings } from "./master-bus";
import {
  clampVariationId,
  Pattern,
  PatternChain,
  sanitizeChain,
  VariationId,
} from "./pattern-types";
import {
  buildPrecomputedPattern,
  type PrecomputedPattern,
} from "./sequencer/precompute";
import {
  createPatternSequence,
  type ScheduleStepContext,
} from "./sequencer/sequencer";
import {
  configureTransportTiming,
  getCurrentStepFromTransport,
  getCurrentTime,
  setTransportBpm,
  setTransportSwing,
  startTransport,
  stopTransport,
} from "./transport/transport";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/**
 * One kit slot to load: which instrument it is, where its sample lives,
 * and its conceptual role (roles drive TR-909 style hat choking).
 */
interface KitSampleDescriptor {
  instrumentId: string;
  samplePath: string;
  role: InstrumentRole;
}

/**
 * Outcome of a loadKit call. "loaded" means this call's channels are now
 * live. "superseded" means a newer loadKit (or dispose) won the loadSeq
 * race while this one was in flight - not an error, the newer load owns
 * the engine's kit. "failed" means this call was still the latest but its
 * samples could not be loaded; the engine keeps the previous kit's
 * channels and the retained descriptors stay untouched, so the caller can
 * reconcile (the bridge rolls the instruments store back, decision 5 in
 * docs/preset-persistence.md).
 */
type KitLoadResult = "loaded" | "superseded" | "failed";

/**
 * Playback configuration pushed from the pattern store.
 */
interface PlaybackConfig {
  chain: PatternChain;
  chainEnabled: boolean;
  variation: VariationId;
}

/**
 * Read-only transport/context diagnostics for debug displays and the
 * context guards: transport state, the context clock, and the resume
 * guard's context health, in one snapshot.
 */
interface EngineDiagnostics {
  transportState: string;
  transportPosition: string;
  contextTime: number;
  contextHealth: AudioContextHealth;
}

/**
 * Options for offline WAV rendering.
 */
interface RenderWavOptions {
  bars: number;
  sampleRate: number;
  /** Append EXPORT_TAIL_TIME of reverb/release tail after the last bar. */
  includeTail: boolean;
  /**
   * Renders a single channel's stem: the channel at this index is treated
   * as the only soloed channel for this render, silencing every other
   * channel. Applied to the render's snapshot only - the retained play
   * params (and live playback) are never touched. A muted channel renders
   * a silent stem, matching what it contributes to the mix.
   */
  soloChannelIndex?: number;
  /**
   * Where the rendered signal is tapped. "master" (the default) renders
   * through the full master chain, exactly like a mix export. "preMaster"
   * connects the channel chains straight to the offline destination, so
   * the render carries channel-level processing only (no compression,
   * saturation, EQ, limiting, or phaser/reverb sends - those are
   * master-bus-level) and plays at unity master volume.
   */
  masterTap?: "master" | "preMaster";
}

/**
 * Smoothing applied to engine-owned channel meters (Tone.Meter smoothing).
 */
const CHANNEL_METER_SMOOTHING = 0.8;

// -----------------------------------------------------------------------------
// AudioEngine
// -----------------------------------------------------------------------------

class AudioEngine {
  // --- Owned Tone.js objects ---
  private channels: InstrumentChannel[] = [];
  private masterBus: MasterBus | null = null;
  private sequence: Sequence | null = null;
  /**
   * Engine-owned per-channel meters, created lazily by getChannelMeter and
   * reconnected to the new channels on every kit swap so external meter
   * consumers survive kit loads.
   */
  private meters: (Meter | null)[] = [];

  // --- Kit metadata (derived at loadKit time) ---
  private roles: InstrumentRole[] = [];
  private ohatIndex = -1;
  /**
   * Last-pushed kit descriptors and resolved sample resolver, retained so
   * offline rendering (renderWav) and in-place recovery (rebuild) can
   * re-create channels without going back to the stores.
   */
  private kitDescriptors: KitSampleDescriptor[] | null = null;
  private kitResolver: SampleSourceResolver | null = null;

  // --- Pushed state (retained so kit reloads and rebuilds can re-apply) ---
  private precomputed: PrecomputedPattern | null = null;
  private playback: PlaybackConfig = {
    chain: sanitizeChain(undefined),
    chainEnabled: false,
    variation: 0,
  };
  /** Raw chain reference from the last push, for identity change detection. */
  private lastPushedChain: PatternChain | null = null;
  private continuousParams: (ContinuousRuntimeParams | undefined)[] = [];
  private playParams: (ChannelPlayParams | undefined)[] = [];
  /** Cached "any channel soloed" flag, kept fresh at push points so the
   * per-step scheduling context never scans playParams. */
  private anySolos = false;
  private masterSettings: MasterChainSettings | null = null;
  private bpm = 120;
  /** Transport swing in Tone units (0-TRANSPORT_SWING_MAX); the bridge converts from knobs. */
  private swing = 0;

  // --- Lifecycle & playback state ---
  private isPlaying = false;
  private initPromise: Promise<void> | null = null;
  /** Serializes rebuild(): concurrent calls share the in-flight rebuild. */
  private rebuildPromise: Promise<void> | null = null;
  /** Bumped by dispose() to cancel in-flight async work. */
  private generation = 0;
  /** Bumped by each loadKit call; a newer call supersedes older ones. */
  private loadSeq = 0;
  /** Bumped whenever initPromise is reset (rebuild/dispose); a superseded
   * doInit disposes the bus it built instead of installing it. */
  private initSeq = 0;
  /** Playback intent, bumped by play() and stop(). Async flows (rebuild's
   * replay, play()'s post-unlock continuation) capture it and stand down
   * when a newer user transport command has superseded them. */
  private intentSeq = 0;

  // --- Event listeners ---
  private variationListeners = new Set<(variation: VariationId) => void>();
  private kitLoadedListeners = new Set<() => void>();
  private playbackStateListeners = new Set<(isPlaying: boolean) => void>();

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Creates the master bus. Idempotent: concurrent and repeated calls share
   * one initialization; call again after dispose() to re-create the graph
   * (strict-mode/HMR safe). A failed init is not cached: a later init()
   * retries from scratch.
   */
  init(masterSettings: MasterChainSettings): Promise<void> {
    if (!this.initPromise) {
      const promise = this.doInit(masterSettings);
      this.initPromise = promise;
      // Clear a cached rejection so a later init() can retry. This handler
      // also keeps fire-and-forget callers from producing unhandled
      // rejections; awaiting callers still observe the error.
      promise.catch((error: unknown) => {
        console.error("AudioEngine init failed:", error);
        if (this.initPromise === promise) {
          this.initPromise = null;
        }
      });
    }
    return this.initPromise;
  }

  private async doInit(masterSettings: MasterChainSettings): Promise<void> {
    // Supersession token: dispose() and rebuild() bump initSeq whenever
    // they reset initPromise, orphaning this doInit (mirrors loadKit's
    // loadSeq pattern).
    const token = this.initSeq;
    this.masterSettings = masterSettings;

    const bus = await MasterBus.create(masterSettings, getDestination());

    // Superseded while the bus was being built (disposed, or a rebuild
    // re-init owns the graph now): drop the orphaned nodes.
    if (token !== this.initSeq) {
      bus.dispose();
      return;
    }

    this.masterBus = bus;

    // Settings may have been pushed while the bus was being built.
    if (this.masterSettings !== masterSettings) {
      bus.applySettings(this.masterSettings ?? masterSettings);
    }

    // Channels may have finished loading before the bus existed.
    this.channels.forEach((channel) => channel.connectToMasterBus(bus));
  }

  /**
   * Stops playback and disposes the sequence, all channels, and the master
   * bus. The engine can be re-initialized afterwards via init().
   */
  dispose(): void {
    this.generation += 1;
    this.loadSeq += 1;
    this.initSeq += 1;

    if (this.isPlaying) {
      this.stop();
    }
    this.disposeSequence();

    this.channels.forEach((channel) => channel.dispose());
    this.channels = [];
    this.roles = [];
    this.ohatIndex = -1;

    this.meters.forEach((meter) => meter?.dispose());
    this.meters = [];

    this.masterBus?.dispose();
    this.masterBus = null;
    this.initPromise = null;
  }

  // ---------------------------------------------------------------------------
  // Kit loading
  // ---------------------------------------------------------------------------

  /**
   * Loads a kit: creates new channels, awaits their buffers, atomically
   * swaps them in, disposes the old ones, and re-applies the last-pushed
   * per-channel params. If another loadKit (or dispose) supersedes this call
   * while it is in flight, the orphaned new channels are disposed and the
   * active ones are left untouched.
   *
   * Resolves with the outcome (see KitLoadResult); it never rejects. On
   * "failed" the previous kit stays live and the retained descriptors are
   * not poisoned, so rebuild and renderWav keep targeting the last kit
   * that actually loaded.
   *
   * During playback the live sequence is deliberately left untouched: the
   * scheduler reads channels fresh on every step, so it picks up the new
   * kit on its next step, and recreating the sequence here would reset the
   * variation chain position (issue #241).
   */
  async loadKit(
    kit: KitSampleDescriptor[],
    resolver?: SampleSourceResolver,
  ): Promise<KitLoadResult> {
    const token = ++this.loadSeq;
    let newChannels: InstrumentChannel[] = [];

    try {
      const samplePaths = kit.map((slot) => slot.samplePath);
      const resolveSampleSource =
        resolver ?? (await prepareSampleSourceResolver(samplePaths));

      newChannels = await createKitChannels(kit, resolveSampleSource);

      if (token !== this.loadSeq) {
        newChannels.forEach((channel) => channel.dispose());
        return "superseded";
      }

      // Retain the kit only now that it has fully loaded (still guarded by
      // the token, so racing loads keep last-loaded-wins semantics): a
      // failed load must never poison the retained descriptors, so rebuild
      // and renderWav always target the last kit that actually loaded.
      this.kitDescriptors = kit;
      this.kitResolver = resolveSampleSource;

      // Swap in new channels atomically
      const oldChannels = this.channels;
      this.channels = newChannels;
      this.roles = kit.map((slot) => slot.role);
      this.ohatIndex = this.roles.indexOf("ohat");
      this.continuousParams.length = kit.length;
      this.playParams.length = kit.length;
      // Truncating playParams may have dropped a soloed slot.
      this.anySolos = this.hasAnySolo();

      // Now dispose old channels - the scheduler has switched to new ones
      // (disposal also disconnects them from any engine-owned meters)
      oldChannels.forEach((channel) => channel.dispose());

      // Drop meters for channel slots that no longer exist
      this.meters.splice(kit.length).forEach((meter) => meter?.dispose());

      // Re-apply retained routing, continuous params, and meter taps
      attachChannels(
        this.channels,
        this.masterBus,
        this.continuousParams,
        this.meters,
      );

      this.kitLoadedListeners.forEach((listener) => listener());
      return "loaded";
    } catch (error) {
      if (token !== this.loadSeq) {
        newChannels.forEach((channel) => channel.dispose());
        return "superseded";
      }
      console.error("Error loading audio buffers:", error);
      return "failed";
    }
  }

  // ---------------------------------------------------------------------------
  // Offline rendering
  // ---------------------------------------------------------------------------

  /**
   * Renders the retained state (pattern, playback config, per-channel
   * params, master settings, bpm, swing, kit) to an audio buffer offline.
   *
   * A pure function of pushed state: it does not require init() to have
   * been called and never touches the live graph or the global destination.
   * All offline nodes (master bus, channels, sequence) are created inside
   * the Offline callback so they belong to the offline context, mirroring
   * live construction exactly - this is the push model's payoff.
   */
  async renderWav(options: RenderWavOptions): Promise<AudioBuffer> {
    const kit = this.kitDescriptors;
    const resolver = this.kitResolver;
    if (!kit || !resolver) {
      throw new Error("renderWav: no kit has been loaded");
    }
    // Master settings are only needed when rendering through the master
    // chain; a pre-master stem render is channel processing only.
    const masterTap = options.masterTap ?? "master";
    const masterSettings = masterTap === "master" ? this.masterSettings : null;
    if (masterTap === "master" && !masterSettings) {
      throw new Error("renderWav: no master settings have been pushed");
    }

    // Snapshot the pushed state so pushes landing mid-render (while the
    // offline samplers load) cannot affect this render.
    const precomputed = this.precomputed;
    const playback = this.playback;
    let playParams = this.playParams.slice();
    const continuousParams = this.continuousParams.slice();
    const bpm = this.bpm;
    const swing = this.swing;

    const roles = kit.map((slot) => slot.role);
    const ohatIndex = roles.indexOf("ohat");
    let anySolos = playParams.some((params) => params?.solo);

    // Stem isolation transforms the SNAPSHOT only: the requested channel
    // becomes the sole soloed channel and anySolos is forced on, so the
    // scheduler skips every other channel - including when the isolated
    // channel has no pushed params yet (an honestly silent stem). Retained
    // engine state is never mutated, so live playback is unaffected.
    const soloChannelIndex = options.soloChannelIndex;
    if (soloChannelIndex !== undefined) {
      playParams = playParams.map(
        (params, index) =>
          params && { ...params, solo: index === soloChannelIndex },
      );
      anySolos = true;
    }

    const barDuration = calculateExportDuration(options.bars, bpm);
    // Add tail for reverb/release decay if requested, otherwise end on the
    // bar line for DAW looping.
    const tailTime = options.includeTail ? EXPORT_TAIL_TIME : 0;
    // Output length in samples, exactly as a render without pre-roll would
    // size it (OfflineAudioContext truncates duration * sampleRate), so the
    // pre-roll below can never change the export's duration.
    const outputSamples = Math.floor(
      (barDuration + tailTime) * options.sampleRate,
    );

    // Pre-roll past the DynamicsCompressorNode warm-up (#318): a fresh
    // offline context starts both compressor instances (parallel comp and
    // limiter) at low internal gain, leaving the first ~100ms of output
    // attenuated. Start the transport a whole-sample pre-roll in and slice
    // those samples back off after rendering, so the export still begins
    // exactly on the bar line at full amplitude. Step-0 events pulled ahead
    // of the bar line (flam grace notes, negative timing nudges) land
    // inside the pre-roll and are trimmed from the export. The pre-roll
    // applies to the pre-master tap too: it has no compressors to warm up,
    // but keeping one code path means every render is scheduled, sliced,
    // and sized identically regardless of tap, and step-0 pre-bar trimming
    // behaves the same in both modes.
    const prerollSamples = Math.ceil(EXPORT_PREROLL_TIME * options.sampleRate);
    const prerollSeconds = prerollSamples / options.sampleRate;
    // One sample of margin so seconds -> samples truncation inside Offline
    // can never leave the render shorter than the slice window below.
    const renderDuration =
      (prerollSamples + outputSamples + 1) / options.sampleRate;

    const toneBuffer = await Offline(
      async ({ transport, destination }) => {
        configureTransportTiming(transport, bpm, swing);

        // Fresh channels against the offline context, from the retained
        // descriptors/resolver - created and wired by the same helpers
        // loadKit uses, so live and offline graphs match. The master tap
        // decides what they feed: the full master chain (masterSettings is
        // non-null exactly when the tap is "master"), or the offline
        // destination directly for pre-master stems.
        const channels = await createKitChannels(kit, resolver);
        if (masterSettings) {
          const bus = await MasterBus.create(masterSettings, destination);
          attachChannels(channels, bus, continuousParams);
        } else {
          attachChannels(channels, null, continuousParams);
          channels.forEach((channel) => channel.connectToNode(destination));
        }

        // Offline scheduling reads a fixed snapshot context; the sequence
        // itself is the exact one live playback uses.
        const stepContext: ScheduleStepContext = {
          channels,
          playParams,
          roles,
          ohatIndex,
          anySolos,
          bpm,
        };

        createPatternSequence({
          chain: playback.chain, // sanitized at push
          chainEnabled: playback.chainEnabled,
          getStepContext: () => stepContext,
          getPrecomputedPattern: () => precomputed,
          getLatestVariation: () => playback.variation,
          barBudget: options.bars,
        });

        transport.start(prerollSeconds);
      },
      renderDuration,
      EXPORT_CHANNEL_COUNT,
      options.sampleRate,
    );

    const nativeBuffer = toneBuffer.get();
    if (!nativeBuffer) {
      throw new Error("Failed to render audio buffer");
    }
    return sliceRenderedBuffer(nativeBuffer, prerollSamples, outputSamples);
  }

  // ---------------------------------------------------------------------------
  // Recovery
  // ---------------------------------------------------------------------------

  /**
   * Tears down and reconstructs the whole audio graph in place from the
   * retained state: master bus, channels, meter connections, and (if
   * playing) the live sequence. This is the repair path for audio-context
   * stalls, used before falling back to a page reload.
   *
   * Concurrency semantics: rebuild is serialized against itself - a
   * rebuild() issued while one is in flight returns the in-flight promise,
   * so two teardown/reconstruct passes can never interleave (which could
   * duplicate the master bus). Internally it reuses init() and loadKit(),
   * whose token machinery arbitrates the remaining races: resetting
   * initPromise bumps initSeq so a superseded doInit drops its bus, and the
   * internal loadKit bumps loadSeq, superseding any in-flight kit load. If
   * the app pushes a NEWER kit while the rebuild's reload is in flight,
   * that push bumps loadSeq again and wins - the rebuild's orphaned
   * channels are disposed and the newer kit lands through the normal
   * loadKit path (bus + meter reconnection included). dispose() bumps the
   * generation, which aborts a concurrent rebuild at its next checkpoint.
   * Finally, playback is only replayed if the user issued no play()/stop()
   * while the rebuild ran (intentSeq), so a rebuild never overrides a user
   * transport command.
   */
  rebuild(): Promise<void> {
    if (!this.rebuildPromise) {
      this.rebuildPromise = this.doRebuild().finally(() => {
        this.rebuildPromise = null;
      });
    }
    return this.rebuildPromise;
  }

  private async doRebuild(): Promise<void> {
    const generation = this.generation;
    const wasPlaying = this.isPlaying;
    const masterSettings = this.masterSettings;

    // --- Teardown ---
    if (wasPlaying) {
      this.stop();
    } else {
      this.disposeSequence();
    }

    // Captured AFTER the stop above (stop bumps it): if the user issues
    // play() or stop() while the rebuild is in flight, the replay at the
    // end stands down instead of overriding the user's command.
    const intent = this.intentSeq;

    // Dispose channels now so nothing stays connected to the outgoing bus.
    // Meter instances are deliberately kept alive (external consumers hold
    // them); disposing a channel disconnects it from its meter, and the
    // loadKit below reconnects the meters to the replacement channels.
    this.channels.forEach((channel) => channel.dispose());
    this.channels = [];

    // Re-create the master bus from retained settings (init-equivalent).
    // Bumping initSeq orphans any in-flight doInit against the old bus.
    this.masterBus?.dispose();
    this.masterBus = null;
    this.initPromise = null;
    this.initSeq += 1;
    if (masterSettings) {
      await this.init(masterSettings);
    }
    if (generation !== this.generation) return; // disposed mid-rebuild

    // Reload the kit from retained descriptors/resolver. loadKit re-applies
    // continuous params and reconnects the bus and meters; the sequence is
    // recreated by the play() below if playback resumes. Transport timing
    // needs no re-apply here: the live transport object survives a graph
    // rebuild, and play() re-applies retained bpm/swing anyway.
    const kit = this.kitDescriptors;
    const resolver = this.kitResolver;
    if (kit) {
      await this.loadKit(kit, resolver ?? undefined);
    }
    if (generation !== this.generation) return; // disposed mid-rebuild

    if (wasPlaying && intent === this.intentSeq) {
      await this.play();
    }
  }

  // ---------------------------------------------------------------------------
  // Pushed state commands
  // ---------------------------------------------------------------------------

  /**
   * Pushes the pattern; precomputed internally. Picked up by the live
   * sequence on its next step.
   */
  setPattern(pattern: Pattern): void {
    this.precomputed = buildPrecomputedPattern(pattern);
  }

  /**
   * Pushes chain/variation playback configuration.
   *
   * Change detection is by REFERENCE IDENTITY on the raw pushed chain: a
   * new chain object (or a chainEnabled flip) recreates the live sequence,
   * restarting chain playback from its first step, while a variation-only
   * push reuses the same chain reference and must NOT restart - it is
   * stored and picked up at the next bar start, preserving the
   * pre-refactor behavior where variation switches never interrupted the
   * running bar. This identity diff is load-bearing; do not deep-compare.
   */
  setPlayback(config: PlaybackConfig): void {
    const structuralChange =
      this.lastPushedChain !== config.chain ||
      this.playback.chainEnabled !== config.chainEnabled;

    this.lastPushedChain = config.chain;
    this.playback = {
      chain: sanitizeChain(config.chain),
      chainEnabled: config.chainEnabled,
      variation: clampVariationId(config.variation),
    };

    if (structuralChange && this.isPlaying) {
      this.createLiveSequence();
    }
  }

  /**
   * Pushes continuous params (filter/pan/volume, domain units) for one
   * channel. Applied to the audio nodes immediately and retained so kit
   * reloads re-apply them.
   */
  setChannelContinuousParams(
    index: number,
    params: ContinuousRuntimeParams,
  ): void {
    this.continuousParams[index] = params;
    this.channels[index]?.applyContinuousParams(params);
  }

  /**
   * Pushes per-note play params (pitch/decay/mute/solo, domain units) for
   * one channel. Read by the scheduler on every trigger, so live knob
   * tweaks during playback stay responsive.
   *
   * Mute and solo transitions are detected here: muting a channel chokes
   * it so anything it is still ringing on goes silent immediately, and
   * whenever a channel's solo state changes while any channel is soloed,
   * all non-solo channels are choked so soloing silences them immediately.
   */
  setChannelPlayParams(index: number, params: ChannelPlayParams): void {
    const previous = this.playParams[index];
    this.playParams[index] = params;
    this.anySolos = this.hasAnySolo();

    if (previous && !previous.mute && params.mute) {
      this.channels[index]?.choke(getCurrentTime());
    }

    if (previous && previous.solo !== params.solo && this.anySolos) {
      this.chokeNonSoloChannels();
    }
  }

  /**
   * Pushes master chain settings (domain units). Retained and applied to
   * the bus.
   */
  setMasterSettings(settings: MasterChainSettings): void {
    this.masterSettings = settings;
    this.masterBus?.applySettings(settings);
  }

  /** Sets the transport tempo; also retained for scheduling math. */
  setTempo(bpm: number): void {
    this.bpm = bpm;
    setTransportBpm(bpm);
  }

  /**
   * Sets the transport swing in DOMAIN units, clamped to the valid Tone
   * swing range [0, TRANSPORT_SWING_MAX]; the bridge converts from the
   * 0-100 knob value.
   */
  setSwing(swing: number): void {
    const clamped = Math.max(0, Math.min(TRANSPORT_SWING_MAX, swing));
    this.swing = clamped;
    setTransportSwing(clamped);
  }

  // ---------------------------------------------------------------------------
  // Transport commands
  // ---------------------------------------------------------------------------

  /**
   * Unlocks the audio context, applies the retained tempo/swing, creates
   * the live sequence from pushed state, and starts the transport. Emits
   * onPlaybackStateChange. If a stop() (or newer play()) lands while the
   * context is unlocking, this play stands down as a no-op.
   */
  async play(): Promise<void> {
    const intent = ++this.intentSeq;
    await ensureAudioContextIsRunning("transport");
    if (intent !== this.intentSeq) return;

    setTransportBpm(this.bpm);
    setTransportSwing(this.swing);

    this.createLiveSequence();
    startTransport();
    this.setIsPlayingAndNotify(true);
  }

  /**
   * Stops the transport, chokes all channels so nothing keeps ringing, and
   * disposes the live sequence (recreated on the next play()). Emits
   * onPlaybackStateChange.
   */
  stop(): void {
    this.intentSeq += 1;
    stopTransport();
    triggerAllInstrumentsReleaseAtTime(this.channels);
    this.disposeSequence();
    this.setIsPlayingAndNotify(false);
  }

  /**
   * Triggers a channel for manual preview using its last-pushed play params.
   */
  previewChannel(index: number): void {
    const channel = this.channels[index];
    const params = this.playParams[index];
    if (!channel || !params) return;

    channel.preview(params.pitch, params.decaySeconds);
  }

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------

  /**
   * Subscribes to playback-variation changes (fired at sequence start and
   * on every bar boundary). Returns an unsubscribe function.
   */
  onPlaybackVariationChange(
    listener: (variation: VariationId) => void,
  ): () => void {
    this.variationListeners.add(listener);
    return () => this.variationListeners.delete(listener);
  }

  /**
   * Subscribes to kit-loaded events (fired after each successful channel
   * swap). Returns an unsubscribe function.
   */
  onKitLoaded(listener: () => void): () => void {
    this.kitLoadedListeners.add(listener);
    return () => this.kitLoadedListeners.delete(listener);
  }

  /**
   * Subscribes to engine playback-state changes, fired whenever the engine
   * starts or stops playing through ANY path (play, stop, rebuild). The
   * bridge mirrors this into the transport store so engine-initiated
   * transitions (e.g. a rebuild that does not replay, or a failed replay)
   * stay reconciled with the UI. Returns an unsubscribe function.
   */
  onPlaybackStateChange(listener: (isPlaying: boolean) => void): () => void {
    this.playbackStateListeners.add(listener);
    return () => this.playbackStateListeners.delete(listener);
  }

  // ---------------------------------------------------------------------------
  // Read-only taps and queries
  // ---------------------------------------------------------------------------

  /**
   * Whether the channel at this index exists and has finished loading its
   * sample. Components refresh this via kit-loaded events (useKitVersion).
   */
  isChannelReady(index: number): boolean {
    return this.channels[index]?.loaded ?? false;
  }

  /**
   * Returns the engine-owned meter tapping one channel's output, creating
   * it lazily. The meter instance is stable across kit swaps: loadKit
   * reconnects it to the replacement channel, so consumers can hold onto it
   * for their lifetime. Disposed with the engine in dispose().
   */
  getChannelMeter(index: number): Meter | null {
    if (index < 0) return null;

    let meter = this.meters[index] ?? null;
    if (!meter) {
      meter = new Meter({
        normalRange: true,
        smoothing: CHANNEL_METER_SMOOTHING,
      });
      this.meters[index] = meter;
      this.channels[index]?.output.connect(meter);
    }
    return meter;
  }

  /**
   * The current sequencer step (0-15) derived from transport ticks. Safe to
   * poll from requestAnimationFrame loops (playhead, step ticker).
   */
  getCurrentStep(): number {
    return getCurrentStepFromTransport();
  }

  /**
   * Read-only transport/context diagnostics for debug displays and the
   * context guards. The engine's single observability surface; not a
   * mutation surface - values are snapshots.
   */
  getDiagnostics(): EngineDiagnostics {
    const transport = getTransport();
    return {
      transportState: transport.state,
      transportPosition: transport.position.toString(),
      contextTime: getContext().currentTime,
      contextHealth: getAudioContextHealth(),
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  /** Recomputes the anySolos cache source; called at push points only. */
  private hasAnySolo(): boolean {
    return this.playParams.some((params) => params?.solo);
  }

  /** Sets engine playback state, notifying listeners on actual change. */
  private setIsPlayingAndNotify(isPlaying: boolean): void {
    if (this.isPlaying === isPlaying) return;
    this.isPlaying = isPlaying;
    this.playbackStateListeners.forEach((listener) => listener(isPlaying));
  }

  /** Chokes every channel that is not soloed (TR-909 style solo cut). */
  private chokeNonSoloChannels(): void {
    const time = getCurrentTime();
    this.channels.forEach((channel, index) => {
      const params = this.playParams[index];
      if (!params || params.solo) return;
      channel.choke(time);
    });
  }

  /** Notifies listeners of the variation now playing (clamped to 0-3). */
  private updateCurrentVariation(variation: number): void {
    const clamped = clampVariationId(variation);
    this.variationListeners.forEach((listener) => listener(clamped));
  }

  /**
   * Reused live scheduling context, refreshed in place on every step so the
   * 16th-note hot path allocates nothing. Offline rendering builds its own
   * fixed snapshot object instead.
   */
  private readonly liveStepContext: ScheduleStepContext = {
    channels: [],
    playParams: [],
    roles: [],
    ohatIndex: -1,
    anySolos: false,
    bpm: 120,
  };

  /** Refreshes the reused per-step scheduling context from pushed state. */
  private refreshLiveStepContext(): ScheduleStepContext {
    const context = this.liveStepContext;
    context.channels = this.channels;
    context.playParams = this.playParams;
    context.roles = this.roles;
    context.ohatIndex = this.ohatIndex;
    context.anySolos = this.anySolos;
    context.bpm = this.bpm;
    return context;
  }

  /**
   * Don't forget: make good music
   *
   * Live playback and offline rendering share the same pattern sequence;
   * the live path supplies fresh-state closures so pattern edits, playback
   * variation pushes, and per-note knob tweaks apply mid-playback.
   */
  private createLiveSequence(): void {
    this.disposeSequence();

    this.sequence = createPatternSequence({
      chain: this.playback.chain, // sanitized at push
      chainEnabled: this.playback.chainEnabled,
      getStepContext: () => this.refreshLiveStepContext(),
      getPrecomputedPattern: () => this.precomputed,
      getLatestVariation: () => this.playback.variation,
      onVariationChange: (variation) => this.updateCurrentVariation(variation),
    });
  }

  /** Disposes the live sequence, stopping it first if it's running. */
  private disposeSequence(): void {
    const sequence = this.sequence;
    if (!sequence) return;

    if (sequence.state === "started") {
      sequence.stop();
    }

    sequence.dispose();
    this.sequence = null;
  }
}

// -----------------------------------------------------------------------------
// Export duration
// -----------------------------------------------------------------------------

/**
 * Duration in seconds of a whole-bar render: bars of STEP_COUNT 16th-note
 * steps at the given bpm. Re-exported through export/wav-exporter so the
 * export form's duration estimate can never drift from what renderWav
 * actually renders.
 */
function calculateExportDuration(bars: number, bpm: number): number {
  const stepDuration = 60 / bpm / 4; // Duration of one 16th note in seconds
  return bars * STEP_COUNT * stepDuration;
}

/**
 * Copies a window of a rendered buffer into a fresh AudioBuffer, dropping
 * the first offsetSamples samples. renderWav renders a warm-up pre-roll
 * ahead of the first bar and cuts it off here, so exports start exactly on
 * the bar line.
 */
function sliceRenderedBuffer(
  buffer: AudioBuffer,
  offsetSamples: number,
  lengthSamples: number,
): AudioBuffer {
  const sliced = new AudioBuffer({
    numberOfChannels: buffer.numberOfChannels,
    length: lengthSamples,
    sampleRate: buffer.sampleRate,
  });
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const data = buffer.getChannelData(channel);
    sliced.copyToChannel(
      data.subarray(offsetSamples, offsetSamples + lengthSamples),
      channel,
    );
  }
  return sliced;
}

// -----------------------------------------------------------------------------
// Kit channel construction (shared by loadKit and renderWav)
// -----------------------------------------------------------------------------

/**
 * Creates one InstrumentChannel per kit slot in parallel. Leak-safe: if any
 * channel fails to create, every channel that DID create is disposed before
 * the first failure is rethrown, so a partial kit load never strands audio
 * nodes in the context.
 */
async function createKitChannels(
  kit: KitSampleDescriptor[],
  resolver: SampleSourceResolver,
): Promise<InstrumentChannel[]> {
  const results = await Promise.allSettled(
    kit.map((slot) =>
      InstrumentChannel.create(slot.instrumentId, slot.samplePath, resolver),
    ),
  );

  const failure = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected",
  );
  if (failure) {
    for (const result of results) {
      if (result.status === "fulfilled") result.value.dispose();
    }
    throw failure.reason;
  }

  return results.map(
    (result) => (result as PromiseFulfilledResult<InstrumentChannel>).value,
  );
}

/**
 * Wires freshly created channels: connects each to the master bus, applies
 * its retained continuous params, and (live only) reconnects engine-owned
 * meters. Shared by loadKit and renderWav so the live and offline graphs
 * are constructed identically.
 */
function attachChannels(
  channels: InstrumentChannel[],
  bus: MasterBus | null,
  continuousParams: (ContinuousRuntimeParams | undefined)[],
  meters?: (Meter | null)[],
): void {
  channels.forEach((channel, index) => {
    if (bus) channel.connectToMasterBus(bus);
    const continuous = continuousParams[index];
    if (continuous) channel.applyContinuousParams(continuous);
    const meter = meters?.[index];
    if (meter) channel.output.connect(meter);
  });
}

// -----------------------------------------------------------------------------
// Singleton
// -----------------------------------------------------------------------------

let audioEngine: AudioEngine | null = null;

/**
 * Returns the module-singleton AudioEngine. The same instance survives
 * dispose(); calling init() again rebuilds the graph (strict-mode/HMR safe).
 */
function getAudioEngine(): AudioEngine {
  if (!audioEngine) {
    audioEngine = new AudioEngine();
  }
  return audioEngine;
}

export { AudioEngine, calculateExportDuration, getAudioEngine };
export type {
  EngineDiagnostics,
  KitLoadResult,
  KitSampleDescriptor,
  PlaybackConfig,
  RenderWavOptions,
};
