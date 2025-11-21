import type { InstrumentRuntime } from "@/types/instrument";

/**
 * Immediately cancel envelope ramps and release all sampler voices at a specific time.
 * Keeps timing deterministic by letting callers supply the scheduled time.
 */
export function stopRuntimeAtTime(
  runtime: InstrumentRuntime,
  time: number,
): void {
  const stopTime = Math.max(0, time);
  const env = runtime.envelopeNode;
  env.cancel(stopTime);

  const internalSignal = (
    env as unknown as {
      _sig?: {
        cancelScheduledValues?: (t: number) => void;
        setValueAtTime?: (v: number, t: number) => void;
      };
    }
  )._sig;
  internalSignal?.cancelScheduledValues?.(stopTime);
  internalSignal?.setValueAtTime?.(0, stopTime);

  env.triggerRelease(stopTime);
  runtime.samplerNode.releaseAll(stopTime);

  // Hard stop any lingering buffer sources and clear internal tracking to avoid resumes later.
  const activeSourcesMap = (
    runtime.samplerNode as unknown as {
      _activeSources?: Map<number, Array<{ stop: (t: number) => void }>>;
    }
  )._activeSources;
  if (activeSourcesMap) {
    activeSourcesMap.forEach((sources) => {
      while (sources.length) {
        const source = sources.shift();
        source?.stop(stopTime);
      }
    });
  }
}
