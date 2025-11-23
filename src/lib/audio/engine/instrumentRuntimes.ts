import type { RefObject } from "react";
import {
  AmplitudeEnvelope,
  Filter,
  Panner,
  Sampler,
} from "tone/build/esm/index";

import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import { getCachedAudioUrl, preCacheAudioFiles } from "../cache";
import {
  ENVELOPE_DEFAULT_ATTACK,
  ENVELOPE_DEFAULT_DECAY,
  ENVELOPE_DEFAULT_RELEASE,
  ENVELOPE_DEFAULT_SUSTAIN,
  SAMPLER_ROOT_NOTE,
} from "./constants";

type SamplerSource = {
  url: string;
  baseUrl?: string;
};

/**
 * Creates runtime InstrumentRuntime nodes from serializable InstrumentData
 */
export async function createInstrumentRuntimes(
  runtimes: RefObject<InstrumentRuntime[]>,
  data: InstrumentData[],
): Promise<void> {
  disposeInstrumentRuntimes(runtimes);

  // Pre-cache unique audio files (this will download external files if configured)
  const samplePaths = Array.from(new Set(data.map((d) => d.sample.path)));
  await preCacheAudioFiles(samplePaths);

  // Create instrument runtimes with cached URLs
  runtimes.current = await Promise.all(data.map(buildInstrumentRuntime));
}

/**
 * Disposes all instrument runtimes and clears the ref
 */
export function disposeInstrumentRuntimes(
  runtimes: RefObject<InstrumentRuntime[]>,
): void {
  if (runtimes.current.length === 0) return;

  const existingRuntimes = runtimes.current;
  runtimes.current = [];
  existingRuntimes.forEach(disposeInstrumentRuntime);
}

/**
 * Builds a single instrument runtime with loaded sampler.
 * Waits for the sampler to fully load before resolving.
 */
export async function buildInstrumentRuntime(
  instrument: InstrumentData,
): Promise<InstrumentRuntime> {
  const filterNode = new Filter(0, "highpass");
  const envelopeNode = new AmplitudeEnvelope(
    ENVELOPE_DEFAULT_ATTACK,
    ENVELOPE_DEFAULT_DECAY,
    ENVELOPE_DEFAULT_SUSTAIN,
    ENVELOPE_DEFAULT_RELEASE,
  );
  const pannerNode = new Panner(0);

  const { url, baseUrl } = await resolveSamplerSource(instrument.sample.path);

  // Create sampler and wait for it to load
  const samplerNode = await new Promise<Sampler>((resolve, reject) => {
    const sampler = new Sampler({
      urls: { [SAMPLER_ROOT_NOTE]: url },
      ...(baseUrl ? { baseUrl } : {}),
      onload: () => resolve(sampler),
      onerror: (err) => reject(err),
    });
  });

  return {
    instrumentId: instrument.meta.id,
    samplerNode,
    envelopeNode,
    filterNode,
    pannerNode,
  };
}

async function resolveSamplerSource(
  samplePath: string,
): Promise<SamplerSource> {
  try {
    const cachedUrl = await getCachedAudioUrl(samplePath);
    if (cachedUrl.startsWith("blob:")) {
      // Use cache blob URLs directly (no baseUrl needed)
      return { url: cachedUrl };
    }
  } catch (error) {
    console.warn(`Falling back to local sample path for ${samplePath}`, error);
  }

  // Fallback: use original sample path with /samples/ baseUrl
  return { url: samplePath, baseUrl: "/samples/" };
}

function disposeInstrumentRuntime(runtime: InstrumentRuntime): void {
  runtime.samplerNode.dispose();
  runtime.envelopeNode.dispose();
  runtime.filterNode.dispose();
  runtime.pannerNode.dispose();
}
