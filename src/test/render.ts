/**
 * Golden-render entry point for browser tests.
 *
 * IMPORTANT: All golden regression tests must render audio exclusively through
 * `renderFixture`. Its public interface (RenderFixtureOptions -> AudioBuffer)
 * is the stable contract across the audio engine refactor - only the
 * internals of this file will be rewritten as engine phases land.
 *
 * Rendering goes through the REAL production path: fixture state is pushed
 * into a throwaway AudioEngine via the engine's command API and rendered with
 * engine.renderWav. Every input is CANONICAL - the same store-facing units
 * production holds (instrument params, the master chain, and swing as the Tone
 * fraction) - and crosses the boundary through the canonical-to-engine bridge
 * (engine-params.ts) exactly like production. No 0-100 knob position lives
 * anywhere in this harness; knob space belongs to the param-control descriptors
 * and the legacy-read frozen island only.
 */

import { getContext } from "tone/build/esm/index";

import {
  instrumentContinuousParams,
  instrumentPlayParams,
  mapMasterToSettings,
  type MasterChainCanonical,
} from "@/core/audio/bridge/engine-params";
import { toKitSampleDescriptors } from "@/core/audio/bridge/kit-descriptors";
import { AudioEngine } from "@/core/audio/engine";
import type {
  Pattern,
  PatternChain,
  VariationId,
} from "@/core/audio/engine/pattern-types";
import type { InstrumentData } from "@/features/instrument/types/instrument";

/**
 * Historical extra render time after the last bar. Kept exported for
 * interface stability: renders go through engine.renderWav with
 * includeTail=false, so buffers end exactly on the bar line.
 */
const RENDER_TAIL_SECONDS = 0.3;

/**
 * Neutral canonical master chain: filter fully open (high-pass at 0 Hz), all
 * sends off, compressor threshold fully open (0 dB), unity volume (0 dB).
 *
 * These are CANONICAL units - the same shape the master-chain store holds - fed
 * straight to the engine bridge via mapMasterToSettings. The values are the
 * exact canonical equivalents of the pre-flip golden knob snapshot (filter 50,
 * sends 0, compThreshold 100, compRatio 50, compAttack 50, compMix 70,
 * masterVolume 92), computed once through the production conversions and inlined
 * so golden/stem renders stay byte-identical (a JS number literal round-trips
 * its double losslessly).
 *
 * Deliberately hand-pinned rather than derived from init(): these are
 * golden-stability snapshots, so golden renders cannot silently shift when
 * the app's default preset changes. compRatio deliberately differs from the
 * app default (5:1 here vs init()'s ~4.29) - the golden baselines were
 * captured against this value. Any edit here invalidates them, so change
 * these values only on purpose.
 */
const DEFAULT_MASTER_PARAMS: MasterChainCanonical = {
  filter: { side: "highpass", cutoffHz: 0 },
  saturation: 0,
  phaser: 0,
  reverb: 0,
  compThreshold: 0,
  compRatio: 5,
  compAttack: 0.025750000000000002,
  compMix: 0.7,
  masterVolume: 0,
};

interface RenderFixtureOptions {
  pattern: Pattern;
  instruments: InstrumentData[];
  /** Blob URLs, one per instrument (parallel array). */
  sampleUrls: string[];
  bpm: number;
  /** Canonical Tone.Transport swing fraction (0..TRANSPORT_SWING_MAX). */
  swing?: number;
  bars?: number;
  chain?: PatternChain;
  chainEnabled?: boolean;
  variation?: VariationId;
  masterParams?: Partial<MasterChainCanonical>;
}

/**
 * Constructs a fresh (non-singleton) AudioEngine and pushes the fixture
 * state through the real engine commands: pattern, playback config,
 * per-channel canonical play/continuous params, master settings, tempo,
 * swing, and the kit.
 *
 * The caller owns the returned engine and MUST dispose() it. Note that
 * loadKit creates live-context channels as a side effect; dispose() cleans
 * them up.
 */
async function createFixtureEngine(
  opts: RenderFixtureOptions,
): Promise<AudioEngine> {
  const {
    pattern,
    instruments,
    sampleUrls,
    bpm,
    swing = 0,
    chain = { steps: [] },
    chainEnabled = false,
    variation = 0,
    masterParams = {},
  } = opts;

  if (sampleUrls.length !== instruments.length) {
    throw new Error(
      `createFixtureEngine: sampleUrls (${sampleUrls.length}) must be parallel to instruments (${instruments.length})`,
    );
  }

  const mergedMasterParams: MasterChainCanonical = {
    ...DEFAULT_MASTER_PARAMS,
    ...masterParams,
  };

  // Map each instrument's sample path to its blob URL so the resolver
  // passes blob URLs through untouched (the default resolver prefixes
  // /samples/ which would break them).
  const pathToUrl = new Map<string, string>();
  instruments.forEach((instrument, i) => {
    pathToUrl.set(instrument.sample.path, sampleUrls[i]);
  });
  const resolveSampleSource = async (path: string) => ({
    url: pathToUrl.get(path) ?? path,
  });

  const engine = new AudioEngine();
  try {
    engine.setPattern(pattern);
    engine.setPlayback({ chain, chainEnabled, variation });

    instruments.forEach((instrument, index) => {
      engine.setChannelPlayParams(
        index,
        instrumentPlayParams(instrument.params),
      );
      engine.setChannelContinuousParams(
        index,
        instrumentContinuousParams(instrument.params),
      );
    });

    engine.setMasterSettings(mapMasterToSettings(mergedMasterParams));
    engine.setTempo(bpm);
    // swing is already the canonical Tone.Transport fraction the engine holds.
    engine.setSwing(swing);

    await engine.loadKit(
      toKitSampleDescriptors(instruments),
      resolveSampleSource,
    );

    return engine;
  } catch (error) {
    engine.dispose();
    throw error;
  }
}

/**
 * Renders a pattern offline through the production render path
 * (engine command API -> engine.renderWav) and returns the resulting
 * native AudioBuffer.
 */
async function renderFixture(opts: RenderFixtureOptions): Promise<AudioBuffer> {
  const engine = await createFixtureEngine(opts);
  try {
    return await engine.renderWav({
      bars: opts.bars ?? 1,
      sampleRate: getContext().sampleRate,
      includeTail: false,
    });
  } finally {
    engine.dispose();
  }
}

export {
  createFixtureEngine,
  renderFixture,
  DEFAULT_MASTER_PARAMS,
  RENDER_TAIL_SECONDS,
};
export type { RenderFixtureOptions };
