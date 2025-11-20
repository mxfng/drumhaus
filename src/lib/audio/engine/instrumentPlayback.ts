import * as Tone from "tone/build/esm/index";

import { transformKnobValue } from "@/components/common/Knob";
import type { InstrumentRuntime } from "@/types/instrument";
import { ENGINE_PITCH_RANGE } from "./constants";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 * Ensures monophonic behavior by releasing any currently playing notes.
 *
 * @param runtime - The instrument runtime containing audio nodes
 * @param pitch - The pitch value (0-100 knob value)
 * @param release - The release value (0-100 knob value)
 * @param sampleDuration - The duration of the sample in seconds
 * @param previousPitch - Optional previous pitch to release specifically
 */
export function playInstrumentSample(
  runtime: InstrumentRuntime,
  pitch: number,
  release: number,
  sampleDuration: number,
  previousPitch: number | null = null,
): number {
  const time = Tone.now();

  // Release envelope
  runtime.envelopeNode.triggerRelease(time);

  // Release previous note if tracking it
  if (previousPitch !== null) {
    const prevPitchValue = transformKnobValue(
      previousPitch,
      ENGINE_PITCH_RANGE,
    );
    runtime.samplerNode.triggerRelease(prevPitchValue, time);
  }

  // Release all sampler notes (monophonic behavior)
  runtime.samplerNode.triggerRelease(time);

  // Trigger envelope attack
  runtime.envelopeNode.triggerAttack(time);

  // Schedule envelope release
  const releaseTime = transformKnobValue(release, [0, sampleDuration]);
  runtime.envelopeNode.triggerRelease(time + releaseTime);

  // Trigger sampler attack with transformed pitch
  const pitchValue = transformKnobValue(pitch, ENGINE_PITCH_RANGE);

  // Skip triggering if the buffer is not ready yet to avoid runtime errors
  if (!runtime.samplerNode.loaded) {
    return pitchValue;
  }
  runtime.samplerNode.triggerAttack(pitchValue, time);

  return pitchValue;
}
