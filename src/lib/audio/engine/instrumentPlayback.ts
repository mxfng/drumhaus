import { now } from "tone/build/esm/index";

import { transformKnobValueExponential } from "@/components/common/knobTransforms";
import type { InstrumentRuntime } from "@/types/instrument";
import { INSTRUMENT_RELEASE_RANGE } from "./constants";
import { transformPitchKnobToFrequency } from "./pitch";
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
  const pitchValue = transformPitchKnobToFrequency(pitch);
  const releaseTime = transformKnobValueExponential(
    release,
    INSTRUMENT_RELEASE_RANGE,
  );

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
