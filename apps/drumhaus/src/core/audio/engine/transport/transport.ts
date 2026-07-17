import { getTransport, Ticks } from "tone/build/esm/index";

import { SEQUENCE_SUBDIVISION, STEP_COUNT } from "../constants";

/**
 * The LIVE transport, captured once at module evaluation.
 *
 * Tone's Offline() swaps the global context (and therefore what
 * getTransport() returns) while an offline render is being set up, and that
 * setup awaits sample loading - so a transport command issued from the app
 * during that window would otherwise land on the OFFLINE transport and be
 * lost or corrupt the render. Routing every live command through this
 * retained reference makes that impossible; the offline path receives its
 * own transport explicitly (configureTransportTiming).
 *
 * Import order cannot capture an offline transport: ESM modules evaluate
 * when the import graph loads, and Offline() is only ever entered from
 * engine code that (transitively) imports this module, so this line always
 * runs against the live context before any render can begin.
 */
const liveTransport = getTransport();

/**
 * Start the live transport and all sources synced to it.
 *
 * With no argument the transport starts immediately (the local path). With
 * atContextTime (absolute seconds on the live context's clock) it starts -
 * or restarts - exactly at that instant: the transport is first stopped at
 * that same instant, which cancels any pending scheduled start and resets
 * the position, so the downbeat lands at atContextTime with position 0
 * whether the transport was running or not. This is the session adapter's
 * grid-aligned start (core/session); Tone's Clock.stop is a safe no-op on
 * a stopped transport.
 */
function startTransport(atContextTime?: number): void {
  if (atContextTime === undefined) {
    liveTransport.start();
    return;
  }
  liveTransport.stop(atContextTime);
  liveTransport.start(atContextTime);
}

/**
 * The LIVE context's underlying AudioContext, reached through the retained
 * live transport (so a call landing mid-offline-render can never hand out
 * the offline context) and Tone's public Context.rawContext surface - no
 * private internals involved (tone-internals.ts keeps its monopoly).
 *
 * Used by the session adapter to map the shared epoch clock onto the audio
 * clock for grid-aligned starts. Note: Tone's default context is a
 * standardized-audio-context wrapper without getOutputTimestamp, so epoch
 * mapping consumers fall back to currentTime anchoring (a few ms, uniform
 * across same-machine tabs - see @haus/bridge clock.ts).
 */
function getLiveRawContext(): BaseAudioContext {
  return liveTransport.context.rawContext;
}

/**
 * Stop the live transport and all sources synced to it.
 */
function stopTransport(): void {
  liveTransport.stop();
}

/**
 * Set the live transport BPM, preserving the current swing.
 */
function setTransportBpm(bpm: number): void {
  configureTransportTiming(liveTransport, bpm, liveTransport.swing);
}

/**
 * Set the live transport swing in canonical units (Tone swing, clamped by the
 * engine to 0-TRANSPORT_SWING_MAX), preserving the current bpm. The transport
 * store already holds the canonical Tone swing, so the bridge forwards it
 * directly with no knob conversion.
 */
function setTransportSwing(swing: number): void {
  configureTransportTiming(liveTransport, liveTransport.bpm.value, swing);
}

/**
 * Configures transport timing settings from domain values (bpm, Tone swing).
 * Works with both online (getTransport) and offline transport objects, and
 * is the single assignment point for transport timing - the live setters
 * above route through it.
 */
function configureTransportTiming(
  transport: {
    bpm: { value: number };
    swing: number;
    swingSubdivision: string;
  },
  bpm: number,
  swing: number,
): void {
  transport.bpm.value = bpm;
  transport.swing = swing;
  transport.swingSubdivision = SEQUENCE_SUBDIVISION;
}

/**
 * The current audio context time of the LIVE context (routed through the
 * retained live transport so a call landing mid-offline-render never reads
 * the offline clock).
 */
function getCurrentTime(): number {
  return liveTransport.now();
}

/**
 * Calculate current step index (0-15) from live transport ticks
 * Use this directly in requestAnimationFrame loops to avoid React re-renders
 */
function getCurrentStepFromTransport(): number {
  const ticks = liveTransport.ticks;
  const ticksPerStep = Ticks(SEQUENCE_SUBDIVISION).valueOf();
  const currentStep = Math.floor(ticks / ticksPerStep) % STEP_COUNT;
  return currentStep;
}

export {
  startTransport,
  stopTransport,
  setTransportBpm,
  setTransportSwing,
  configureTransportTiming,
  getCurrentTime,
  getCurrentStepFromTransport,
  getLiveRawContext,
};
