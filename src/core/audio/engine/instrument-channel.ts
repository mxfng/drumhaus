/**
 * Instrument channel audio processing.
 *
 * Cohesive class owning one instrument's audio graph:
 * sampler -> envelope -> lowpass -> highpass -> panner.
 * All methods take canonical values (Hz, dB, seconds, playback pitch); the
 * stores already hold canonical units, so the bridge (core/audio/bridge)
 * forwards them directly with no knob mapping.
 */

import {
  AmplitudeEnvelope,
  Filter,
  now,
  Panner,
  Sampler,
  type ToneAudioNode,
} from "tone/build/esm/index";

import {
  defaultSampleSourceResolver,
  SamplerSource,
  SampleSourceResolver,
} from "@/core/audio/cache/sample";
import {
  ENVELOPE_DEFAULT_ATTACK,
  ENVELOPE_DEFAULT_DECAY,
  ENVELOPE_DEFAULT_RELEASE,
  ENVELOPE_DEFAULT_SUSTAIN,
  INSTRUMENT_FILTER_RANGE,
  SAMPLER_ROOT_NOTE,
} from "./constants";
import {
  applySplitFilterWithRamp,
  createSplitFilterNode,
} from "./fx/split-filter";
import type { ContinuousRuntimeParams } from "./instrument/types";
import type { MasterBus } from "./master-bus";
import {
  getEnvelopeInternalSignal,
  getSamplerActiveSources,
} from "./tone-internals";
import { getCurrentTime } from "./transport/transport";

interface InstrumentChannelNodes {
  samplerNode: Sampler;
  /** Used for decay envelope and pseudo-monophonic behavior */
  envelopeNode: AmplitudeEnvelope;
  lowPassFilterNode: Filter;
  highPassFilterNode: Filter;
  pannerNode: Panner;
}

/**
 * A single note to trigger, in domain values.
 */
interface InstrumentHit {
  /** Playback pitch (frequency, as produced by semitonesToHz) */
  pitch: number;
  /** Envelope decay time in seconds */
  decaySeconds: number;
  /** Velocity 0-1; defaults to 1 */
  velocity?: number;
}

/**
 * One instrument's runtime audio graph and triggering behavior.
 * Used during playback and rendering.
 */
class InstrumentChannel {
  readonly instrumentId: string; // matches InstrumentData.meta.id

  private samplerNode: Sampler;
  /** Used for decay envelope and pseudo-monophonic behavior */
  private envelopeNode: AmplitudeEnvelope;
  private lowPassFilterNode: Filter;
  private highPassFilterNode: Filter;
  private pannerNode: Panner;

  private constructor(instrumentId: string, nodes: InstrumentChannelNodes) {
    this.instrumentId = instrumentId;
    this.samplerNode = nodes.samplerNode;
    this.envelopeNode = nodes.envelopeNode;
    this.lowPassFilterNode = nodes.lowPassFilterNode;
    this.highPassFilterNode = nodes.highPassFilterNode;
    this.pannerNode = nodes.pannerNode;
  }

  /**
   * Builds all instrument audio nodes and waits for the sample to load.
   * Nodes are created unconnected; routing happens in connectToMasterBus.
   */
  static async create(
    instrumentId: string,
    samplePath: string,
    resolveSampleSource: SampleSourceResolver = defaultSampleSourceResolver,
  ): Promise<InstrumentChannel> {
    // Split filter section: dedicated LP/HP nodes avoid type switching artifacts
    const lowPassFilterNode = createSplitFilterNode(
      INSTRUMENT_FILTER_RANGE[1],
      "lowpass",
    );
    const highPassFilterNode = createSplitFilterNode(
      INSTRUMENT_FILTER_RANGE[0],
      "highpass",
    );

    // Amplitude envelope for pseudo-monophonic decay control
    const envelopeNode = new AmplitudeEnvelope(
      ENVELOPE_DEFAULT_ATTACK,
      ENVELOPE_DEFAULT_DECAY,
      ENVELOPE_DEFAULT_SUSTAIN,
      ENVELOPE_DEFAULT_RELEASE,
    );

    // Stereo panner for instrument positioning
    const pannerNode = new Panner(0);

    try {
      const { url, baseUrl } = await resolveSamplerSource(
        samplePath,
        resolveSampleSource,
      );
      const samplerNode = await createSampler(url, baseUrl);

      return new InstrumentChannel(instrumentId, {
        samplerNode,
        envelopeNode,
        lowPassFilterNode,
        highPassFilterNode,
        pannerNode,
      });
    } catch (error) {
      // Sampler resolution/creation failed: dispose the nodes built above
      // so a failed channel never strands nodes in the context.
      // (createSampler disposes its own failed Sampler.)
      lowPassFilterNode.dispose();
      highPassFilterNode.dispose();
      envelopeNode.dispose();
      pannerNode.dispose();
      throw error;
    }
  }

  /**
   * Whether the sampler has finished loading its sample.
   */
  get loaded(): boolean {
    return this.samplerNode.loaded;
  }

  /**
   * The channel's output node (the panner).
   * Used for master bus connection and external taps (e.g. gain meters).
   */
  get output(): ToneAudioNode {
    return this.pannerNode;
  }

  /**
   * Chains internal nodes in signal flow order
   * (Sampler -> Envelope -> Filters -> Panner)
   * and connects the output to the master bus's parallel compression input.
   */
  connectToMasterBus(bus: MasterBus): void {
    this.chainInternalNodes();

    // Connect to master bus (parallel compression)
    bus.connectInput(this.output);
  }

  /**
   * Chains internal nodes and connects the output straight to an arbitrary
   * node, bypassing any master bus. Used for pre-master stem rendering,
   * where the channel's own processing is the entire chain.
   */
  connectToNode(node: ToneAudioNode): void {
    this.chainInternalNodes();
    this.output.connect(node);
  }

  /** Wires the internal signal flow: sampler -> envelope -> LP -> HP -> pan. */
  private chainInternalNodes(): void {
    this.samplerNode.chain(
      this.envelopeNode,
      this.lowPassFilterNode,
      this.highPassFilterNode,
      this.pannerNode,
    );
  }

  /**
   * Applies continuous instrument params (domain values) to audio nodes.
   * Expects pan in -1..1, volume in dB, and filter as the canonical
   * `{ side, cutoffHz }` value. Does NOT handle per-note params (pitch,
   * decay, solo, mute) - those are pushed into the engine as
   * ChannelPlayParams and read by the scheduler on every trigger.
   */
  applyContinuousParams(params: ContinuousRuntimeParams): void {
    applySplitFilterWithRamp(
      this.lowPassFilterNode,
      this.highPassFilterNode,
      params.filter,
      {
        minFrequency: INSTRUMENT_FILTER_RANGE[0],
        maxFrequency: INSTRUMENT_FILTER_RANGE[1],
      },
    );

    this.pannerNode.pan.value = params.pan;
    this.samplerNode.volume.value = params.volume;
  }

  /**
   * Unified instrument trigger used by all playback paths.
   * Enforces monophonic behavior (chokes first) and triggers envelope +
   * sampler in sync.
   *
   * This ensures consistent behavior across manual playback, sequencer
   * playback, and any other trigger sources.
   *
   * Note that the inputs are domain values, not knob values. Be sure to
   * convert knob values from state with mapping functions before calling.
   */
  trigger(time: number, hit: InstrumentHit): void {
    // Enforce monophonic behavior - stop any previous notes for all pitches
    this.choke(time);

    // Trigger envelope and sampler in sync
    const env = this.envelopeNode;
    env.triggerAttack(time);
    env.triggerRelease(time + hit.decaySeconds);
    this.samplerNode.triggerAttack(hit.pitch, time, hit.velocity ?? 1);
  }

  /**
   * Immediately cancel envelope ramps and release all sampler voices at a
   * specific time. Keeps timing deterministic by letting callers supply the
   * scheduled time.
   *
   * This method accesses Tone.js private internals (via tone-internals.ts)
   * to ensure complete audio cleanup. The standard public API (cancel,
   * triggerRelease, releaseAll) doesn't always fully stop ongoing envelopes
   * and buffer sources, so we need to access internals for reliable stopping
   * behavior.
   */
  choke(time: number): void {
    const stopTime = Math.max(0, time);
    const env = this.envelopeNode;

    // Cancel any scheduled envelope changes
    env.cancel(stopTime);

    // Access internal signal to ensure complete cancellation of automation
    const internalSignal = getEnvelopeInternalSignal(env);
    if (internalSignal) {
      internalSignal.cancelScheduledValues?.(stopTime);
      internalSignal.setValueAtTime?.(0, stopTime);
    }

    // Release the envelope and all sampler voices
    env.triggerRelease(stopTime);
    this.samplerNode.releaseAll(stopTime);

    // Hard stop any lingering buffer sources and clear internal tracking
    // This prevents audio from resuming unexpectedly
    const activeSourcesMap = getSamplerActiveSources(this.samplerNode);
    if (activeSourcesMap) {
      activeSourcesMap.forEach((sources) => {
        while (sources.length) {
          const source = sources.shift();
          source?.stop(stopTime);
        }
      });
    }
  }

  /**
   * Releases the sampler voice for a specific pitch at a specific time.
   * Used for TR-909 style open-hat choking.
   */
  releasePitch(pitch: number, time: number): void {
    this.samplerNode.triggerRelease(pitch, time);
  }

  /**
   * Triggers the channel for preview/manual playback at the current time.
   *
   * Takes canonical/engine values: `pitch` is the playback pitch (a frequency,
   * as produced by semitonesToHz from the canonical semitone offset) and
   * `decaySeconds` is the envelope decay time in seconds.
   */
  preview(pitch: number, decaySeconds: number): void {
    if (!this.samplerNode.loaded) {
      return;
    }

    this.trigger(now(), { pitch, decaySeconds });
  }

  /**
   * Disposes the channel's audio nodes.
   */
  dispose(): void {
    this.samplerNode.dispose();
    this.envelopeNode.dispose();
    this.lowPassFilterNode.dispose();
    this.highPassFilterNode.dispose();
    this.pannerNode.dispose();
  }
}

// -----------------------------------------------------------------------------
// Sampler construction helpers
// -----------------------------------------------------------------------------

/**
 * Resolves sample source, falling back to local path if needed.
 */
async function resolveSamplerSource(
  samplePath: string,
  resolveSampleSource: SampleSourceResolver,
): Promise<SamplerSource> {
  try {
    return await resolveSampleSource(samplePath);
  } catch (error) {
    console.warn(`Falling back to local sample path for ${samplePath}`, error);
    return { url: samplePath, baseUrl: "/samples/" };
  }
}

/**
 * Creates a Tone.js Sampler and waits for it to load. If loading fails, the
 * failed Sampler is disposed before the promise rejects so it cannot leak.
 */
function createSampler(url: string, baseUrl?: string): Promise<Sampler> {
  return new Promise<Sampler>((resolve, reject) => {
    const sampler = new Sampler({
      urls: { [SAMPLER_ROOT_NOTE]: url },
      ...(baseUrl ? { baseUrl } : {}),
      onload: () => resolve(sampler),
      onerror: (err) => {
        // Sample loading is async, so `sampler` is always assigned by the
        // time onerror can fire.
        sampler.dispose();
        reject(err);
      },
    });
  });
}

// -----------------------------------------------------------------------------
// Multi-channel helpers
// -----------------------------------------------------------------------------

/**
 * Chokes all instrument channels. Used when stopping playback to prevent
 * audio from continuing.
 */
function triggerAllInstrumentsReleaseAtTime(
  channels: InstrumentChannel[],
  time: number = getCurrentTime(),
): void {
  channels.forEach((channel) => {
    channel.choke(time);
  });
}

export { InstrumentChannel, triggerAllInstrumentsReleaseAtTime };
export type { InstrumentHit };
