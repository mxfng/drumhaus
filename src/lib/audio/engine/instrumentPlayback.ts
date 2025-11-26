import { now } from "tone/build/esm/index";

import { instrumentReleaseMapping, pitchMapping } from "@/lib/knob/mapping";
import type { InstrumentRuntime } from "@/types/instrument";
import { triggerInstrumentAtTime } from "./trigger";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export function playInstrumentSample(
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
