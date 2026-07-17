/**
 * The adapter between the Zustand stores / AudioEngine and the shared haus
 * session (issue #417, epic #414). Mirrors core/audio/bridge: store
 * subscriptions feed session commands, session changes flow back into the
 * stores, and an applying-guard keeps inbound state from echoing back out
 * as intents.
 *
 * The session side is @haus/bridge-react's SessionController, which
 * owns the external-store snapshot and the deferred-command readiness
 * handling (the connect-window edge where intents can be dropped before a
 * conductor exists); this adapter owns only what is drumhaus-specific.
 *
 * Direction map while linked:
 * - inbound (session -> app): bpm -> transport store, scene -> pattern
 *   store variation, playing -> engine start aligned to the shared grid /
 *   engine stop.
 * - outbound (app -> session): user bpm changes, play/stop, and variation
 *   selection become session commands; while this tab conducts with the
 *   chain enabled, the engine's playback-variation changes drive setScene
 *   (the conductor's chain is the session's song structure).
 *
 * Grid alignment: playback starts at the shared grid's next bar boundary
 * (during the start lead window that is bar 0's downbeat itself), mapped
 * onto the live AudioContext with @haus/bridge's epoch clock helpers.
 * Alignment is deferred one macrotask so a user gesture's own
 * store-driven engine.play() lands first and the aligned start supersedes
 * it (the engine's playback intent sequencing guarantees the later call
 * wins). A tempo rebase while playing is applied as a glide - the protocol
 * rebases phase-continuously and the transport bpm change preserves phase,
 * so no restart (and no chain reset) is needed; realignment (a scheduled
 * restart on the boundary) happens only when adopting a grid this tab is
 * not already playing on. Same-machine context drift is negligible in v1;
 * there is no correction loop.
 */

import {
  createHausSession,
  epochNowMs,
  epochToContextTime,
  nextBarStartEpochMs,
  type BridgeAudioContext,
  type HausSession,
  type SessionState,
} from "@haus/bridge";
import {
  createSessionController,
  type SessionController,
} from "@haus/bridge-react";

import { getAudioEngine } from "@/core/audio/engine";
import { clampVariationId } from "@/core/audio/engine/pattern-types";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";

/**
 * Lead added ahead of "now" when picking the bar boundary to start on, so
 * the scheduled context time is always comfortably in the future once the
 * start command reaches the transport.
 */
const SCHEDULE_MARGIN_MS = 50;

/**
 * The engine surface the adapter drives. Structural so tests can inject a
 * fake; the default is the real AudioEngine facade.
 */
interface SessionEngine {
  play(options?: { atContextTime?: number }): Promise<void>;
  stop(): void;
  getLiveAudioContext(): BridgeAudioContext;
  onPlaybackVariationChange(listener: (variation: number) => void): () => void;
}

interface SessionAdapterOptions {
  /** Engine command surface; defaults to the AudioEngine singleton. */
  engine?: SessionEngine;
  /**
   * Session factory, invoked once per linked period (every link() wraps a
   * fresh session); defaults to a real BroadcastChannel-backed session.
   */
  createSession?: () => HausSession;
  /** Epoch clock; defaults to epochNowMs. Injectable for tests. */
  now?: () => number;
}

interface SessionAdapter {
  /** Join the shared session (seed local state, then connect). Idempotent. */
  link(): void;
  /** Leave the session and restore fully local behavior. Idempotent. */
  unlink(): void;
  isLinked(): boolean;
  /**
   * The controller the LINK control reads via useSession. A stable facade:
   * its identity (and subscriptions to it) survive the per-link controller
   * swaps underneath.
   */
  controller: SessionController;
}

/** The shared musical grid this tab last aligned its playback to. */
interface SharedGrid {
  bpm: number;
  startEpochMs: number;
}

function stateGrid(state: SessionState): SharedGrid | null {
  return state.playing && state.startEpochMs !== null
    ? { bpm: state.bpm, startEpochMs: state.startEpochMs }
    : null;
}

function createSessionAdapter(
  options: SessionAdapterOptions = {},
): SessionAdapter {
  const engine = options.engine ?? getAudioEngine();
  const now = options.now ?? epochNowMs;
  const createSession =
    options.createSession ??
    (() => createHausSession({ instrument: "drumhaus" }));

  // Every linked period wraps a FRESH session. The bridge's disconnect()
  // deliberately never resets state or rev, so reusing one instance across
  // link cycles would leak the previous period into the next: a stale
  // playing grid auto-starts playback on re-link, and a stale-high rev
  // makes a re-linked follower deaf to a younger conductor (and
  // time-travels the session if it later wins a handover). The controller
  // is recreated with the session; the facade below keeps a stable
  // identity for UI subscribers (useSession) across swaps.
  let controller = createSessionController(createSession(), { now });
  const facadeListeners = new Set<() => void>();
  const notifyFacade = () => facadeListeners.forEach((listener) => listener());
  let forwardUnsubscribe = controller.subscribe(notifyFacade);

  function swapInFreshController(): void {
    forwardUnsubscribe();
    controller = createSessionController(createSession(), { now });
    forwardUnsubscribe = controller.subscribe(notifyFacade);
    notifyFacade();
  }

  const facade: SessionController = {
    getSnapshot: () => controller.getSnapshot(),
    subscribe(listener) {
      facadeListeners.add(listener);
      return () => {
        facadeListeners.delete(listener);
      };
    },
    connect: () => controller.connect(),
    disconnect: () => controller.disconnect(),
    play: () => controller.play(),
    stop: () => controller.stop(),
    setBpm: (bpm) => controller.setBpm(bpm),
    setScene: (scene) => controller.setScene(scene),
  };

  /** Applying-guard: inbound store writes must not echo back as intents. */
  let applying = false;
  /** Grid the local transport is (or is being) aligned to; null while the
   * local engine is not playing on a shared grid. */
  let appliedGrid: SharedGrid | null = null;
  /** Latest inbound playback target, coalesced into one deferred sync.
   * undefined = nothing pending; null = stop. */
  let pendingGrid: SharedGrid | null | undefined;
  let pendingSyncTimer: ReturnType<typeof setTimeout> | null = null;
  let unsubscribers: (() => void)[] = [];

  const linked = () => controller.getSnapshot().linked;

  // --- Playback alignment (session grid -> engine) ---

  function startAlignedToGrid(grid: SharedGrid): void {
    // During the start lead window the "next bar boundary" is bar 0's
    // downbeat itself, so fresh starts and mid-playback joins share one
    // formula. Drumhaus patterns loop one bar, so starting at a bar
    // boundary with position 0 is exact alignment.
    const target = nextBarStartEpochMs(
      {
        rev: 0,
        bpm: grid.bpm,
        playing: true,
        startEpochMs: grid.startEpochMs,
        scene: 0,
      },
      now() + SCHEDULE_MARGIN_MS,
    );
    if (target === null) return; // unreachable: the grid implies playing
    const atContextTime = epochToContextTime(
      engine.getLiveAudioContext(),
      target,
      now,
    );
    void engine.play({ atContextTime }).catch(() => {
      // The context could not start (suspended with no usable gesture):
      // stay stopped locally and let a later state or user gesture retry.
      appliedGrid = null;
    });
  }

  function applyPlaybackSync(grid: SharedGrid | null): void {
    if (!linked()) return; // unlinked while the sync was pending

    if (grid === null) {
      // Follower stop is immediate. Skipped when already idle so a stop
      // echo can never cancel an in-flight user play().
      if (useTransportStore.getState().isPlaying || appliedGrid !== null) {
        engine.stop();
      }
      appliedGrid = null;
      return;
    }

    if (appliedGrid !== null && useTransportStore.getState().isPlaying) {
      const sameGrid =
        appliedGrid.bpm === grid.bpm &&
        appliedGrid.startEpochMs === grid.startEpochMs;
      // A tempo rebase is phase-continuous by protocol design and the
      // transport bpm was already updated inbound, so the local transport
      // glides onto the new grid - no restart (and no chain reset).
      const tempoRebase = appliedGrid.bpm !== grid.bpm;
      if (sameGrid || tempoRebase) {
        appliedGrid = grid;
        return;
      }
    }

    appliedGrid = grid;
    startAlignedToGrid(grid);
  }

  /**
   * Defer playback alignment one macrotask, coalescing bursts (latest
   * wins). The deferral is load-bearing: when the local user pressed play,
   * togglePlay's own engine.play() is issued synchronously after its store
   * write; running the aligned play after it makes the aligned start the
   * newest playback intent, so the immediate unaligned start stands down.
   */
  function schedulePlaybackSync(grid: SharedGrid | null): void {
    pendingGrid = grid;
    if (pendingSyncTimer !== null) return;
    pendingSyncTimer = setTimeout(() => {
      pendingSyncTimer = null;
      const target = pendingGrid;
      pendingGrid = undefined;
      if (target !== undefined) applyPlaybackSync(target);
    }, 0);
  }

  // --- Inbound: controller snapshot -> stores ---

  function handleControllerChange(): void {
    const snapshot = controller.getSnapshot();
    if (!snapshot.linked) return;

    applying = true;
    try {
      const transport = useTransportStore.getState();
      if (transport.bpm !== snapshot.state.bpm) {
        // setBpm also pushes engine.setTempo, so a playing transport
        // glides onto a rebased grid within the same synchronous dispatch.
        transport.setBpm(snapshot.state.bpm);
      }
      const pattern = usePatternStore.getState();
      if (pattern.variation !== snapshot.state.scene) {
        // The engine applies variation changes at the next bar on its own;
        // no extra quantization here.
        pattern.setVariation(snapshot.state.scene);
      }
    } finally {
      applying = false;
    }

    schedulePlaybackSync(stateGrid(snapshot.state));
  }

  // --- Outbound: store changes -> session commands ---

  function handleBpmChange(bpm: number): void {
    if (applying || !linked()) return;
    if (controller.getSnapshot().state.bpm === bpm) return;
    controller.setBpm(bpm);
  }

  function handleVariationChange(variation: number): void {
    if (applying || !linked()) return;
    const scene = clampVariationId(variation);
    if (controller.getSnapshot().state.scene === scene) return;
    controller.setScene(scene);
  }

  function handlePlayingChange(isPlaying: boolean): void {
    if (applying || !linked()) return;
    const state = controller.getSnapshot().state;
    if (isPlaying === state.playing) {
      // Local play while the session is already playing (e.g. this tab
      // stayed stopped earlier because its context could not start): the
      // play gesture is the join - align to the existing grid instead of
      // posting a no-op intent.
      if (isPlaying && appliedGrid === null) {
        schedulePlaybackSync(stateGrid(state));
      }
      return;
    }
    if (isPlaying) {
      controller.play();
    } else {
      controller.stop();
    }
  }

  function handlePlaybackVariationChange(variation: number): void {
    if (applying || !linked()) return;
    // The conductor's chain is the session's song structure: bar-boundary
    // variation changes driven by the chain become scene changes.
    const snapshot = controller.getSnapshot();
    if (!snapshot.isConductor) return;
    if (!usePatternStore.getState().chainEnabled) return;
    const scene = clampVariationId(variation);
    if (snapshot.state.scene === scene) return;
    controller.setScene(scene);
  }

  // --- Link lifecycle ---

  function link(): void {
    if (linked()) return;
    // A fresh session (and controller) for this linked period - see the
    // comment at the top of the factory.
    swapInFreshController();
    appliedGrid = null;

    // Seed BEFORE connecting: pre-connect commands apply locally without a
    // rev bump, so if this tab becomes conductor its seeded state
    // broadcasts; if a session already exists, the conductor's state wins
    // and the seeds are simply overwritten. Local playback is seeded too:
    // conducting while playing publishes a fresh grid this tab then aligns
    // itself to via its own state change.
    const transport = useTransportStore.getState();
    controller.setBpm(transport.bpm);
    controller.setScene(usePatternStore.getState().variation);
    if (transport.isPlaying) {
      controller.play();
    }

    // Session -> app, wired before connect so nothing is missed.
    unsubscribers.push(controller.subscribe(handleControllerChange));

    controller.connect();

    // App -> session (manual prev-diffing, as in use-engine-bridge).
    let prevBpm = useTransportStore.getState().bpm;
    let prevPlaying = useTransportStore.getState().isPlaying;
    unsubscribers.push(
      useTransportStore.subscribe((state) => {
        if (state.bpm !== prevBpm) {
          prevBpm = state.bpm;
          handleBpmChange(state.bpm);
        }
        if (state.isPlaying !== prevPlaying) {
          prevPlaying = state.isPlaying;
          handlePlayingChange(state.isPlaying);
        }
      }),
    );
    let prevVariation = usePatternStore.getState().variation;
    unsubscribers.push(
      usePatternStore.subscribe((state) => {
        if (state.variation !== prevVariation) {
          prevVariation = state.variation;
          handleVariationChange(state.variation);
        }
      }),
    );
    unsubscribers.push(
      engine.onPlaybackVariationChange(handlePlaybackVariationChange),
    );
  }

  function unlink(): void {
    if (!linked()) return;
    if (pendingSyncTimer !== null) {
      clearTimeout(pendingSyncTimer);
      pendingSyncTimer = null;
    }
    pendingGrid = undefined;
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [];
    controller.disconnect();
    appliedGrid = null;
    // Fully local from here: playback (if any) keeps running untouched.
  }

  return {
    link,
    unlink,
    isLinked: linked,
    controller: facade,
  };
}

// -----------------------------------------------------------------------------
// Singleton
// -----------------------------------------------------------------------------

let sessionAdapter: SessionAdapter | null = null;

/** The app-wide adapter instance driven by use-session-bridge. */
function getSessionAdapter(): SessionAdapter {
  if (!sessionAdapter) {
    sessionAdapter = createSessionAdapter();
  }
  return sessionAdapter;
}

export { createSessionAdapter, getSessionAdapter };
export type { SessionAdapter, SessionAdapterOptions, SessionEngine };
