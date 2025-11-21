import * as Tone from "tone/build/esm/index";

import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import { stopRuntimeAtTime } from "./runtimeStops";

/**
 * Release all active voices on non-solo instruments so soloing immediately silences them.
 */
export function releaseNonSoloRuntimes(
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  time: number = Tone.now(),
): void {
  if (runtimes.length === 0) return;

  for (let i = 0; i < runtimes.length; i++) {
    const runtime = runtimes[i];
    const instrument = instruments[i];
    if (!runtime || !instrument) continue;
    if (instrument.params.solo) continue;

    stopRuntimeAtTime(runtime, time);
  }
}
