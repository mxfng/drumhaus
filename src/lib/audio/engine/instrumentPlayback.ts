import * as Tone from "tone/build/esm/index";

import { transformKnobValueExponential } from "@/components/common/Knob";
import type { InstrumentRuntime } from "@/types/instrument";
import { INSTRUMENT_RELEASE_RANGE } from "./constants";
import { transformPitchKnobToFrequency } from "./pitch";
import { triggerSamplerHit } from "./triggers";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export function playInstrumentSample(
  runtime: InstrumentRuntime,
  pitch: number,
  release: number,
): number {
  const time = Tone.now();
  const pitchValue = transformPitchKnobToFrequency(pitch);
  const releaseTime = transformKnobValueExponential(
    release,
    INSTRUMENT_RELEASE_RANGE,
  );
  triggerSamplerHit(runtime, time, pitchValue, releaseTime, 1, {
    monophonic: true,
  });

  return pitchValue;
}
