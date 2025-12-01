import type { RefObject } from "react";
import {
  AmplitudeEnvelope,
  Filter,
  Panner,
  Sampler,
} from "tone/build/esm/index";

import {
  InstrumentData,
  InstrumentRuntime,
} from "@/features/instrument/types/instrument";
import {
  defaultSampleSourceResolver,
  SamplerSource,
  SampleSourceResolver,
} from "../sampleSources";
import {
  ENVELOPE_DEFAULT_ATTACK,
  ENVELOPE_DEFAULT_DECAY,
  ENVELOPE_DEFAULT_RELEASE,
  ENVELOPE_DEFAULT_SUSTAIN,
  SAMPLER_ROOT_NOTE,
} from "./constants";

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Creates runtime InstrumentRuntime nodes from serializable InstrumentData.
 */
export async function createInstrumentRuntimes(
  runtimes: RefObject<InstrumentRuntime[]>,
  data: InstrumentData[],
  resolveSampleSource: SampleSourceResolver = defaultSampleSourceResolver,
): Promise<void> {
  disposeInstrumentRuntimes(runtimes);

  runtimes.current = await Promise.all(
    data.map((instrument) =>
      buildInstrumentRuntime(instrument, resolveSampleSource),
    ),
  );
}

/**
 * Disposes all instrument runtimes and clears the ref.
 */
export function disposeInstrumentRuntimes(
  runtimes: RefObject<InstrumentRuntime[]>,
): void {
  if (!runtimes.current || runtimes.current.length === 0) return;

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
  resolveSampleSource: SampleSourceResolver = defaultSampleSourceResolver,
): Promise<InstrumentRuntime> {
  const filterNode = new Filter(0, "highpass");

  const envelopeNode = new AmplitudeEnvelope(
    ENVELOPE_DEFAULT_ATTACK,
    ENVELOPE_DEFAULT_DECAY,
    ENVELOPE_DEFAULT_SUSTAIN,
    ENVELOPE_DEFAULT_RELEASE,
  );

  const pannerNode = new Panner(0);

  const { url, baseUrl } = await resolveSamplerSource(
    instrument.sample.path,
    resolveSampleSource,
  );
  const samplerNode = await createSampler(url, baseUrl);

  return {
    instrumentId: instrument.meta.id,
    samplerNode,
    envelopeNode,
    filterNode,
    pannerNode,
  };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

async function resolveSamplerSource(
  samplePath: string,
  resolveSampleSource: SampleSourceResolver,
): Promise<SamplerSource> {
  try {
    return await resolveSampleSource(samplePath);
  } catch (error) {
    console.warn(`Falling back to local sample path for ${samplePath}`, error);
    return { url: samplePath, baseUrl: "/samples/" };
  }
}

function createSampler(url: string, baseUrl?: string): Promise<Sampler> {
  return new Promise<Sampler>((resolve, reject) => {
    const sampler = new Sampler({
      urls: { [SAMPLER_ROOT_NOTE]: url },
      ...(baseUrl ? { baseUrl } : {}),
      onload: () => resolve(sampler),
      onerror: (err) => reject(err),
    });
  });
}

function disposeInstrumentRuntime(runtime: InstrumentRuntime): void {
  runtime.samplerNode.dispose();
  runtime.envelopeNode.dispose();
  runtime.filterNode.dispose();
  runtime.pannerNode.dispose();
}
