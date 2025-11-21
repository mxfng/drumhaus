import * as Tone from "tone/build/esm/index";

import type { InstrumentRuntime } from "@/types/instrument";
import { stopRuntimeAtTime } from "./runtimeStops";

// Small gate keeps the transient before the decay starts; padding avoids abrupt sampler stops.
export const RELEASE_GATE_SECONDS = 0.005;
export const LONG_RELEASE_GATELESS_THRESHOLD = 1.5;
export const LONG_RELEASE_HOLD_RATIO = 0.85;
export const LONG_RELEASE_MIN_HOLD = 1;
export const SAMPLER_RELEASE_PADDING = 0.02;

type TriggerOptions = {
  monophonic?: boolean;
};

export function computeReleaseTimes(
  timeSeconds: number,
  releaseTime: number,
): { releaseStartAt: number; samplerReleaseAt: number } {
  const gateSeconds =
    releaseTime >= LONG_RELEASE_GATELESS_THRESHOLD
      ? Math.max(LONG_RELEASE_MIN_HOLD, releaseTime * LONG_RELEASE_HOLD_RATIO)
      : RELEASE_GATE_SECONDS;
  const releaseStartAt = timeSeconds + gateSeconds;
  const samplerReleaseAt =
    releaseStartAt + releaseTime + SAMPLER_RELEASE_PADDING;

  return { releaseStartAt, samplerReleaseAt };
}

export function triggerSamplerHit(
  runtime: InstrumentRuntime,
  timeSeconds: number,
  pitch: number,
  releaseTime: number,
  velocity: number,
  options: TriggerOptions = {},
): void {
  const { monophonic = true } = options;
  const startTime = timeSeconds;
  const { releaseStartAt, samplerReleaseAt } = computeReleaseTimes(
    startTime,
    releaseTime,
  );

  const env = runtime.envelopeNode;
  env.release = releaseTime;

  if (monophonic) {
    stopRuntimeAtTime(runtime, startTime);
  }

  env.triggerAttack(startTime);
  env.triggerRelease(releaseStartAt);

  if (runtime.samplerNode.loaded) {
    runtime.samplerNode.triggerAttack(pitch, startTime, velocity);
    runtime.samplerNode.triggerRelease(pitch, samplerReleaseAt);
  }
}
