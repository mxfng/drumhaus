import * as Tone from "tone/build/esm/index";

import type { InstrumentRuntime } from "@/types/instrument";
import { SEQUENCE_SUBDIVISION, TRANSPORT_SWING_RANGE } from "./constants";

/**
 * Start the audio context
 */
export async function startAudioContext(): Promise<void> {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }
}

/**
 * Start the transport and all sources synced to the transport
 * @param time The time when the transport should start.
 * @param offset The timeline offset to start the transport.
 */
export function startTransport(time?: number, offset?: number): void {
  Tone.Transport.start(time, offset);
}

/**
 * Stop the transport and all sources synced to the transport.
 * @param time The time when the transport should stop.
 * @param onStop Optional callback to execute after stopping the transport.
 */
export function stopTransport(time?: number, onStop?: () => void): void {
  Tone.Transport.stop(time);
  if (onStop) {
    onStop();
  }
}

/**
 * Set the transport BPM
 */
export function setTransportBpm(bpm: number): void {
  Tone.Transport.bpm.value = bpm;
}

/**
 * Set the transport swing
 */
export function setTransportSwing(swing: number): void {
  const newSwing = (swing / TRANSPORT_SWING_RANGE[1]) * 0.5;
  Tone.Transport.swingSubdivision = SEQUENCE_SUBDIVISION;
  Tone.Transport.swing = newSwing;
}

/**
 * Releases all samples on all instrument runtimes. Used when stopping playback to prevent audio from continuing
 */
export function releaseAllRuntimes(runtimes: InstrumentRuntime[]): void {
  const time = getCurrentTime();
  runtimes.forEach((runtime) => {
    runtime.samplerNode.releaseAll(time);
  });
}

/**
 * The current audio context time of the global context.
 */
export function getCurrentTime(): number {
  return Tone.now();
}
