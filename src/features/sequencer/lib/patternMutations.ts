import { STEP_COUNT } from "@/core/audio/engine/constants";
import { clampNudge } from "@/features/sequencer/lib/timing";
import { Pattern, TimingNudge } from "@/features/sequencer/types/pattern";
import { VariationId } from "@/features/sequencer/types/sequencer";

export function toggleStep(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
  step: number,
): void {
  const currentValue =
    pattern.voices[voiceIndex].variations[variation].triggers[step];
  pattern.voices[voiceIndex].variations[variation].triggers[step] =
    !currentValue;
  if (!currentValue) {
    pattern.voices[voiceIndex].variations[variation].velocities[step] = 1;
  }
}

export function setVelocity(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
  step: number,
  velocity: number,
): void {
  pattern.voices[voiceIndex].variations[variation].velocities[step] = velocity;
}

export function clearStepSequence(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
): void {
  pattern.voices[voiceIndex].variations[variation].triggers =
    Array(STEP_COUNT).fill(false);
  pattern.voices[voiceIndex].variations[variation].velocities =
    Array(STEP_COUNT).fill(1);
}

export function toggleAccent(
  pattern: Pattern,
  variation: VariationId,
  step: number,
): void {
  const currentValue = pattern.variationMetadata[variation].accent[step];
  pattern.variationMetadata[variation].accent[step] = !currentValue;
}

export function toggleRatchet(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
  step: number,
): void {
  const currentValue =
    pattern.voices[voiceIndex].variations[variation].ratchets[step];
  pattern.voices[voiceIndex].variations[variation].ratchets[step] =
    !currentValue;
}

export function toggleFlam(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
  step: number,
): void {
  const currentValue =
    pattern.voices[voiceIndex].variations[variation].flams[step];
  pattern.voices[voiceIndex].variations[variation].flams[step] = !currentValue;
}

export function setTimingNudge(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
  nudge: TimingNudge,
): void {
  pattern.voices[voiceIndex].variations[variation].timingNudge = nudge;
}

export function adjustTimingNudge(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
  delta: number,
): void {
  const currentNudge =
    pattern.voices[voiceIndex].variations[variation].timingNudge;
  pattern.voices[voiceIndex].variations[variation].timingNudge = clampNudge(
    currentNudge + delta,
  );
}
