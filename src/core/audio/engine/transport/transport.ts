import { getTransport, now, Ticks } from "tone/build/esm/index";

import {
  SEQUENCE_SUBDIVISION,
  STEP_COUNT,
  TRANSPORT_SWING_MAX,
  TRANSPORT_SWING_RANGE,
} from "../constants";
import { ensureAudioContextIsRunning } from "../context/manager";

/**
 * Start or resume the audio context
 */
async function startAudioContext(): Promise<void> {
  await ensureAudioContextIsRunning("transport");
}

/**
 * Start the transport and all sources synced to the transport
 * @param time The time when the transport should start.
 * @param offset The timeline offset to start the transport.
 */
function startTransport(time?: number, offset?: number): void {
  getTransport().start(time, offset);
}

/**
 * Stop the transport and all sources synced to the transport.
 * @param time The time when the transport should stop.
 * @param onStop Optional callback to execute after stopping the transport.
 */
function stopTransport(time?: number, onStop?: () => void): void {
  getTransport().stop(time);
  if (onStop) {
    onStop();
  }
}

/**
 * Set the transport BPM
 */
function setTransportBpm(bpm: number): void {
  getTransport().bpm.value = bpm;
}

/**
 * Set the transport swing
 */
function setTransportSwing(swing: number): void {
  const newSwing = (swing / TRANSPORT_SWING_RANGE[1]) * TRANSPORT_SWING_MAX;
  getTransport().swingSubdivision = SEQUENCE_SUBDIVISION;
  getTransport().swing = newSwing;
}

/**
 * Configures transport timing settings.
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
  transport.swing = (swing / TRANSPORT_SWING_RANGE[1]) * TRANSPORT_SWING_MAX;
  transport.swingSubdivision = SEQUENCE_SUBDIVISION;
}

/**
 * The current audio context time of the global context.
 */
function getCurrentTime(): number {
  return now();
}

/**
 * Calculate current step index (0-15) from transport ticks
 * Use this directly in requestAnimationFrame loops to avoid React re-renders
 */
function getCurrentStepFromTransport(): number {
  const transport = getTransport();
  const ticks = transport.ticks;
  const ticksPerStep = Ticks(SEQUENCE_SUBDIVISION).valueOf();
  const currentStep = Math.floor(ticks / ticksPerStep) % STEP_COUNT;
  return currentStep;
}

export {
  startAudioContext,
  startTransport,
  stopTransport,
  setTransportBpm,
  setTransportSwing,
  configureTransportTiming,
  getCurrentTime,
  getCurrentStepFromTransport,
};
