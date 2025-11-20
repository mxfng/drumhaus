import type { MutableRefObject } from "react";
import * as Tone from "tone/build/esm/index";

import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import { getCachedAudioUrl, preCacheAudioFiles } from "../cache";
import { SAMPLER_ROOT_NOTE } from "./constants";

type SamplerSource = {
  url: string;
  baseUrl?: string;
};

/**
 * Creates runtime InstrumentRuntime nodes from serializable InstrumentData
 */
export async function createInstrumentRuntimes(
  runtimes: MutableRefObject<InstrumentRuntime[]>,
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
  runtimes: MutableRefObject<InstrumentRuntime[]>,
): void {
  if (runtimes.current.length === 0) return;

  const existingRuntimes = runtimes.current;
  runtimes.current = [];
  existingRuntimes.forEach(disposeInstrumentRuntime);
}

async function buildInstrumentRuntime(
  instrument: InstrumentData,
): Promise<InstrumentRuntime> {
  const filterNode = new Tone.Filter(0, "highpass");
  const envelopeNode = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
  const pannerNode = new Tone.Panner(0);

  const { url, baseUrl } = await resolveSamplerSource(instrument.sample.path);

  const samplerNode = new Tone.Sampler({
    urls: { [SAMPLER_ROOT_NOTE]: url },
    ...(baseUrl ? { baseUrl } : {}),
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
