import { now } from "tone/build/esm/index";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import { instrumentDecayMapping, tuneMapping } from "@/shared/knob/lib/mapping";
import { triggerInstrumentAtTime } from "./trigger";

/**
 * Plays a sample on an instrument runtime for preview/manual playback.
 */
export async function playInstrumentSample(
  runtime: InstrumentRuntime,
  tune: number,
  decay: number,
) {
  if (!runtime.samplerNode.loaded) {
    return;
  }

  const time = now();
  const tuneValue = tuneMapping.knobToDomain(tune);
  const decayValue = instrumentDecayMapping.knobToDomain(decay);

  triggerInstrumentAtTime(runtime, tuneValue, decayValue, time);
}
