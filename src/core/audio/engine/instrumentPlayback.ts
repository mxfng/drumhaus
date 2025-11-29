import { now } from "tone/build/esm/index";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import {
  instrumentReleaseMapping,
  pitchMapping,
} from "@/shared/lib/knob/mapping";
import { ensureAudioContextRunning } from "./audioContextManager";
import { triggerInstrumentAtTime } from "./trigger";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export async function playInstrumentSample(
  runtime: InstrumentRuntime,
  pitch: number,
  release: number,
) {
  const isReady = await ensureAudioContextRunning("instrument-sample");
  if (!isReady) return;

  if (!runtime.samplerNode.loaded) {
    return;
  }

  const time = now();
  const pitchValue = pitchMapping.knobToDomain(pitch);
  const releaseValue = instrumentReleaseMapping.knobToDomain(release);

  triggerInstrumentAtTime(runtime, pitchValue, releaseValue, time);
}
