import * as Tone from "tone/build/esm/index";

import { transformKnobValue } from "@/components/common/Knob";
import type { InstrumentRuntime } from "@/types/instrument";
import { transformPitchKnobToFrequency } from "./pitch";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export function playInstrumentSample(
  runtime: InstrumentRuntime,
  pitch: number,
  release: number,
  sampleDuration: number,
): number {
  const time = Tone.now();
  const pitchValue = transformPitchKnobToFrequency(pitch);
  const releaseTime = transformKnobValue(release, [0, sampleDuration]);

  // Enforce monophonic behavior
  runtime.envelopeNode.triggerRelease(time);
  runtime.samplerNode.triggerRelease(time);

  // Skip triggering if the buffer is not ready yet
  if (!runtime.samplerNode.loaded) {
    return pitchValue;
  }

  runtime.envelopeNode.triggerAttack(time);
  runtime.envelopeNode.triggerRelease(time + releaseTime);
  runtime.samplerNode.triggerAttack(pitchValue, time);

  return pitchValue;
}
