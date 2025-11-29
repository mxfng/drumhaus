import { now } from "tone/build/esm/index";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import {
  instrumentReleaseMapping,
  pitchMapping,
} from "@/shared/knob/lib/mapping";
import { triggerInstrumentAtTime } from "./trigger";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export async function playInstrumentSample(
  runtime: InstrumentRuntime,
  pitch: number,
  release: number,
) {
  if (!runtime.samplerNode.loaded) {
    return;
  }

  const time = now();
  const pitchValue = pitchMapping.knobToDomain(pitch);
  const releaseValue = instrumentReleaseMapping.knobToDomain(release);

  triggerInstrumentAtTime(runtime, pitchValue, releaseValue, time);
}
