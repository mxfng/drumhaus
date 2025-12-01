import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import { stopRuntimeAtTime } from "./runtimeStops";

/**
 * Unified instrument trigger function used by all playback paths.
 * Enforces monophonic behavior and triggers envelope + sampler in sync.
 *
 * This ensures consistent behavior across manual playback, sequencer playback,
 * and any other trigger sources.
 *
 * Note that the inputs to this function are the domain values, not the knob values.
 * Be sure to convert knob values from state with mapping functions before calling this function.
 */
export function triggerInstrumentAtTime(
  runtime: InstrumentRuntime,
  tune: number,
  decay: number,
  time: number,
  velocity: number = 1,
): void {
  // Enforce monophonic behavior - stop any previous notes for all pitches
  stopRuntimeAtTime(runtime, time);

  // Trigger envelope and sampler in sync
  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(time + decay);
  runtime.samplerNode.triggerAttack(tune, time, velocity);
}
