import type { InstrumentRuntime } from "@/types/instrument";

/**
 * Internal Tone.js types for accessing private APIs.
 * These are implementation details that may change between Tone.js versions.
 *
 * @warning These types are based on Tone.js internals and are not part of the public API.
 * Update these if Tone.js changes its internal structure.
 */
interface ToneBufferSource {
  stop: (time: number) => void;
}

interface ToneSamplerInternal {
  _activeSources?: Map<number, ToneBufferSource[]>;
}

/**
 * Safely access internal sampler sources map for hard stopping.
 * Returns undefined if the internal structure doesn't match expectations.
 */
function getSamplerActiveSources(
  sampler: InstrumentRuntime["samplerNode"],
): ToneSamplerInternal["_activeSources"] | undefined {
  const internal = sampler as unknown as ToneSamplerInternal;
  return internal._activeSources;
}

/**
 * Immediately release all sampler voices at a specific time.
 * Keeps timing deterministic by letting callers supply the scheduled time.
 *
 * This function accesses Tone.js private internals to ensure complete audio cleanup.
 * The standard public API (releaseAll) doesn't always fully stop buffer sources,
 * so we need to access internals for reliable stopping behavior.
 */
export function stopRuntimeAtTime(
  runtime: InstrumentRuntime,
  time: number,
): void {
  const stopTime = Math.max(0, time);

  // Release all sampler voices
  runtime.samplerNode.releaseAll(stopTime);

  // Hard stop any lingering buffer sources and clear internal tracking
  // This prevents audio from resuming unexpectedly
  const activeSourcesMap = getSamplerActiveSources(runtime.samplerNode);
  if (activeSourcesMap) {
    activeSourcesMap.forEach((sources) => {
      while (sources.length) {
        const source = sources.shift();
        source?.stop(stopTime);
      }
    });
  }
}
