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
 * @param time The time when the transport should start.
 * @param offset The timeline offset to start the transport.
 */
function startTransport(time?: number, offset?: number): void {
  liveTransport.start(time, offset);
}

/**
 * Stop the live transport and all sources synced to it.
 * @param time The time when the transport should stop.
 */
function stopTransport(time?: number): void {
  liveTransport.stop(time);
}

/**
 * Set the live transport BPM
 */
function setTransportBpm(bpm: number): void {
  liveTransport.bpm.value = bpm;
}

/**
 * Set the live transport swing in domain units (0-0.5 Tone swing).
 * Knob-value conversion happens at the boundary in
 * bridge/knob-to-domain.ts (transportSwingKnobToDomain).
 */
function setTransportSwing(swing: number): void {
  liveTransport.swingSubdivision = SEQUENCE_SUBDIVISION;
  liveTransport.swing = swing;
}

/**
 * Configures transport timing settings from domain values (bpm, 0-0.5 swing).
 * Works with both online (getTransport) and offline transport objects.
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
};
