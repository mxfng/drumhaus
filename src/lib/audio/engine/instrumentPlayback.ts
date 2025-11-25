import { now } from "tone/build/esm/index";

import { pitchMapping, releaseMapping } from "@/lib/knob/mapping";
import type { InstrumentRuntime } from "@/types/instrument";
import { stopRuntimeAtTime } from "./runtimeStops";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export function playInstrumentSample(
  runtime: InstrumentRuntime,
  pitch: number,
  release: number,
): number {
  const time = now();
  const pitchValue = pitchMapping.stepToValue(pitch);
  const releaseTime = releaseMapping.stepToValue(release);

  // Enforce monophonic behavior; mirrors transport stop logic
  stopRuntimeAtTime(runtime, time);

  // Skip triggering if the buffer is not ready yet
  if (!runtime.samplerNode.loaded) {
    return pitchValue;
  }

  runtime.envelopeNode.triggerAttack(time);
  runtime.envelopeNode.triggerRelease(time + releaseTime);
  runtime.samplerNode.triggerAttack(pitchValue, time);

  return pitchValue;
}
