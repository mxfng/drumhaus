import { now } from "tone/build/esm/index";

import { instrumentReleaseMapping, pitchMapping } from "@/lib/knob/mapping";
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
  const pitchValue = pitchMapping.knobToDomain(pitch);
  const releaseTime = instrumentReleaseMapping.knobToDomain(release);

  // Enforce monophonic behavior
  stopRuntimeAtTime(runtime, time);

  // Skip triggering if the buffer is not ready yet
  if (!runtime.samplerNode.loaded) {
    return pitchValue;
  }

  // Use triggerAttackRelease with duration to automatically handle release
  runtime.samplerNode.triggerAttackRelease(pitchValue, releaseTime, time);

  return pitchValue;
}
