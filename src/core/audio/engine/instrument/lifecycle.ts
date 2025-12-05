import {
  defaultSampleSourceResolver,
  SampleSourceResolver,
} from "@/core/audio/cache/sample";
import { buildInstrumentNodes, disposeInstrumentNodes } from "./nodes";
import { InstrumentData, InstrumentRuntime } from "./types";

/**
 * Creates a single instrument runtime with loaded sampler.
 * Returns the runtime - caller manages storage.
 */
export async function createInstrumentRuntime(
  instrument: InstrumentData,
  resolveSampleSource: SampleSourceResolver = defaultSampleSourceResolver,
): Promise<InstrumentRuntime> {
  return await buildInstrumentNodes(
    instrument.meta.id,
    instrument.sample.path,
    resolveSampleSource,
  );
}

/**
 * Creates all instrument runtimes from instrument data.
 * Returns array of runtimes - caller manages storage.
 */
export async function createInstrumentRuntimes(
  data: InstrumentData[],
  resolveSampleSource: SampleSourceResolver = defaultSampleSourceResolver,
): Promise<InstrumentRuntime[]> {
  return await Promise.all(
    data.map((instrument) =>
      createInstrumentRuntime(instrument, resolveSampleSource),
    ),
  );
}

/**
 * Disposes a single instrument runtime.
 */
export function disposeInstrumentRuntime(
  runtime: InstrumentRuntime | null,
): void {
  if (!runtime) return;
  disposeInstrumentNodes(runtime);
}

/**
 * Disposes all instrument runtimes.
 */
export function disposeInstrumentRuntimes(
  runtimes: InstrumentRuntime[] | null,
): void {
  if (!runtimes || runtimes.length === 0) return;
  runtimes.forEach(disposeInstrumentRuntime);
}
