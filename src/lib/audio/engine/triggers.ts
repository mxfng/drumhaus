import * as Tone from "tone/build/esm/index";

import type { InstrumentRuntime } from "@/types/instrument";

// Small gate keeps the transient before the decay starts; padding avoids abrupt sampler stops.
export const RELEASE_GATE_SECONDS = 0.005;
export const LONG_RELEASE_GATELESS_THRESHOLD = 1.5;
export const LONG_RELEASE_HOLD_RATIO = 0.5;
export const LONG_RELEASE_MIN_HOLD = 0.75;
export const SAMPLER_RELEASE_PADDING = 0.02;

type TriggerOptions = {
  monophonic?: boolean;
};

export function computeReleaseTimes(
  time: Tone.Unit.Time,
  releaseTime: number,
): { releaseStartAt: number; samplerReleaseAt: number } {
  const gateSeconds =
    releaseTime >= LONG_RELEASE_GATELESS_THRESHOLD
      ? Math.max(LONG_RELEASE_MIN_HOLD, releaseTime * LONG_RELEASE_HOLD_RATIO)
      : RELEASE_GATE_SECONDS;
  const releaseStartAt = Tone.Time(time).toSeconds() + gateSeconds;
  const samplerReleaseAt =
    releaseStartAt + releaseTime + SAMPLER_RELEASE_PADDING;

  return { releaseStartAt, samplerReleaseAt };
}

export function triggerSamplerHit(
  runtime: InstrumentRuntime,
  time: Tone.Unit.Time,
  pitch: number,
  releaseTime: number,
  velocity: number,
  options: TriggerOptions = {},
): void {
  const { monophonic = true } = options;
  const { releaseStartAt, samplerReleaseAt } = computeReleaseTimes(
    time,
    releaseTime,
  );

  runtime.envelopeNode.release = releaseTime;

  if (monophonic) {
    runtime.envelopeNode.triggerRelease(time);
    runtime.samplerNode.triggerRelease(pitch, time);
  }

  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(releaseStartAt);

  if (runtime.samplerNode.loaded) {
    runtime.samplerNode.triggerAttack(pitch, time, velocity);
    runtime.samplerNode.triggerRelease(samplerReleaseAt);
  }
}
