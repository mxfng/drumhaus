import * as Tone from "tone/build/esm/index";

import type { InstrumentRuntime } from "@/types/instrument";

/**
 * Starts the Tone.js audio context if it's not already running
 */
export async function startAudioContext(): Promise<void> {
  if (Tone.context.state !== "running") {
    await Tone.start();
  }
}

/**
 * Starts the transport
 */
export function startTransport(): void {
  Tone.Transport.start();
}

/**
 * Stops the transport
 * @param onStop - Optional callback to execute after stopping
 */
export function stopTransport(onStop?: () => void): void {
  Tone.Transport.stop();
  if (onStop) {
    onStop();
  }
}

/**
 * Gets the current audio time
 */
export function getCurrentTime(): number {
  return Tone.now();
}

/**
 * Sets the BPM (beats per minute) of the transport
 */
export function setTransportBpm(bpm: number): void {
  Tone.Transport.bpm.value = bpm;
}

/**
 * Sets the swing amount for the transport
 * @param swing - Swing value from 0-100 (will be transformed to 0-0.5)
 */
export function setTransportSwing(swing: number): void {
  // Transform swing value from 0-100 to 0-0.5
  const newSwing = (swing / 100) * 0.5;
  Tone.Transport.swingSubdivision = "16n";
  Tone.Transport.swing = newSwing;
}

/**
 * Releases all samples on all instrument runtimes
 * Used when stopping playback to prevent audio from continuing
 */
export function releaseAllSamples(
  instrumentRuntimes: InstrumentRuntime[],
): void {
  const time = getCurrentTime();
  instrumentRuntimes.forEach((runtime) => {
    runtime.samplerNode.triggerRelease("C2", time);
  });
}
