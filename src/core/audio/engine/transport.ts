import {
  getContext,
  getTransport,
  now,
  start,
  Ticks,
} from "tone/build/esm/index";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import {
  SEQUENCE_SUBDIVISION,
  STEP_COUNT,
  TRANSPORT_SWING_MAX,
  TRANSPORT_SWING_RANGE,
} from "./constants";
import { stopRuntimeAtTime } from "./runtimeStops";

/**
 * Start or resume the audio context
 */
export async function startAudioContext(): Promise<void> {
  const context = getContext();

  if (context.state === "suspended") {
    await context.resume();
  } else if (context.state !== "running") {
    await start();
  }
}

/**
 * Start the transport and all sources synced to the transport
 * @param time The time when the transport should start.
 * @param offset The timeline offset to start the transport.
 */
export function startTransport(time?: number, offset?: number): void {
  getTransport().start(time, offset);
}

/**
 * Stop the transport and all sources synced to the transport.
 * @param time The time when the transport should stop.
 * @param onStop Optional callback to execute after stopping the transport.
 */
export function stopTransport(time?: number, onStop?: () => void): void {
  getTransport().stop(time);
  if (onStop) {
    onStop();
  }
}

/**
 * Set the transport BPM
 */
export function setTransportBpm(bpm: number): void {
  getTransport().bpm.value = bpm;
}

/**
 * Set the transport swing
 */
export function setTransportSwing(swing: number): void {
  const newSwing = (swing / TRANSPORT_SWING_RANGE[1]) * TRANSPORT_SWING_MAX;
  getTransport().swingSubdivision = SEQUENCE_SUBDIVISION;
  getTransport().swing = newSwing;
}

/**
 * Releases all samples on all instrument runtimes. Used when stopping playback to prevent audio from continuing
 */
export function releaseAllRuntimes(
  runtimes: InstrumentRuntime[],
  time: number = getCurrentTime(),
): void {
  runtimes.forEach((runtime) => {
    stopRuntimeAtTime(runtime, time);
  });
}

/**
 * The current audio context time of the global context.
 */
export function getCurrentTime(): number {
  return now();
}

/**
 * Calculate current step index (0-15) from transport ticks
 * Use this directly in requestAnimationFrame loops to avoid React re-renders
 */
export function getCurrentStepFromTransport(): number {
  const transport = getTransport();
  const ticks = transport.ticks;
  const ticksPerStep = Ticks(SEQUENCE_SUBDIVISION).valueOf();
  const currentStep = Math.floor(ticks / ticksPerStep) % STEP_COUNT;
  return currentStep;
}
