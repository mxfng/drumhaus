import {
  AmplitudeEnvelope,
  Filter,
  Panner,
  Sampler,
} from "tone/build/esm/index";

import {
  defaultSampleSourceResolver,
  SamplerSource,
  SampleSourceResolver,
} from "@/core/audio/cache/sample";
import {
  ENVELOPE_DEFAULT_ATTACK,
  ENVELOPE_DEFAULT_DECAY,
  ENVELOPE_DEFAULT_RELEASE,
  ENVELOPE_DEFAULT_SUSTAIN,
  INSTRUMENT_FILTER_RANGE,
  SAMPLER_ROOT_NOTE,
} from "@/core/audio/engine/constants";
import { InstrumentRuntime } from "./types";

// -----------------------------------------------------------------------------
// Filter Section
// -----------------------------------------------------------------------------

/**
 * Creates split filter section for instrument.
 * Uses dedicated LP/HP nodes to avoid type switching artifacts.
 */
function createFilterSection() {
  const lowPassFilterNode = new Filter(INSTRUMENT_FILTER_RANGE[1], "lowpass");
  const highPassFilterNode = new Filter(INSTRUMENT_FILTER_RANGE[0], "highpass");

  return { lowPassFilterNode, highPassFilterNode };
}

// -----------------------------------------------------------------------------
// Envelope Section
// -----------------------------------------------------------------------------

/**
 * Creates amplitude envelope for pseudo-monophonic decay control.
 */
function createEnvelopeSection() {
  const envelopeNode = new AmplitudeEnvelope(
    ENVELOPE_DEFAULT_ATTACK,
    ENVELOPE_DEFAULT_DECAY,
    ENVELOPE_DEFAULT_SUSTAIN,
    ENVELOPE_DEFAULT_RELEASE,
  );

  return { envelopeNode };
}

// -----------------------------------------------------------------------------
// Panner Section
// -----------------------------------------------------------------------------

/**
 * Creates stereo panner for instrument positioning.
 */
function createPannerSection() {
  const pannerNode = new Panner(0);
  return { pannerNode };
}

// -----------------------------------------------------------------------------
// Sampler Section
// -----------------------------------------------------------------------------

/**
 * Resolves sample source, falling back to local path if needed.
 */
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

/**
 * Creates a Tone.js Sampler and waits for it to load.
 */
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

/**
 * Creates sampler section by resolving and loading sample.
 */
async function createSamplerSection(
  samplePath: string,
  resolveSampleSource: SampleSourceResolver,
) {
  const { url, baseUrl } = await resolveSamplerSource(
    samplePath,
    resolveSampleSource,
  );
  const samplerNode = await createSampler(url, baseUrl);

  return { samplerNode };
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Builds all instrument audio nodes.
 * Pure function that creates nodes without connecting them.
 */
export async function buildInstrumentNodes(
  instrumentId: string,
  samplePath: string,
  resolveSampleSource: SampleSourceResolver = defaultSampleSourceResolver,
): Promise<InstrumentRuntime> {
  const filterNodes = createFilterSection();
  const envelopeNodes = createEnvelopeSection();
  const pannerNodes = createPannerSection();
  const samplerNodes = await createSamplerSection(
    samplePath,
    resolveSampleSource,
  );

  return {
    instrumentId,
    ...samplerNodes,
    ...envelopeNodes,
    ...filterNodes,
    ...pannerNodes,
  };
}

/**
 * Disposes a single instrument runtime's nodes.
 */
export function disposeInstrumentNodes(runtime: InstrumentRuntime): void {
  runtime.samplerNode.dispose();
  runtime.envelopeNode.dispose();
  runtime.lowPassFilterNode.dispose();
  runtime.highPassFilterNode.dispose();
  runtime.pannerNode.dispose();
}
