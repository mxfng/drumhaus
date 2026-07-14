/**
 * Golden-render entry point for browser tests.
 *
 * IMPORTANT: All golden regression tests must render audio exclusively through
 * `renderFixture`. Its public interface (RenderFixtureOptions -> AudioBuffer)
 * is the stable contract across the audio engine refactor - only the
 * internals of this file will be rewritten as engine phases land.
 *
 * Since phase 5, rendering goes through the REAL production path: fixture
 * state is pushed into a throwaway AudioEngine via the engine's command API
 * (with knob-to-domain conversion at the boundary, exactly like the bridge)
 * and rendered with engine.renderWav. Every golden test therefore exercises
 * the actual export pipeline end to end.
 */

import { getContext } from "tone/build/esm/index";

import { toKitSampleDescriptors } from "@/core/audio/bridge/kit-descriptors";
import {
  instrumentKnobsToContinuousParams,
  instrumentKnobsToPlayParams,
  mapParamsToSettings,
  transportSwingKnobToDomain,
  type MasterChainParams,
} from "@/core/audio/bridge/knob-to-domain";
import { AudioEngine } from "@/core/audio/engine";
import type {
  Pattern,
  PatternChain,
  VariationId,
} from "@/core/audio/engine/pattern-types";
import type { InstrumentData } from "@/features/instrument/types/instrument";

/**
 * Historical extra render time after the last bar. Kept exported for
 * interface stability: since phase 5 renders go through engine.renderWav
 * with includeTail=false, so buffers end exactly on the bar line.
 */
const RENDER_TAIL_SECONDS = 0.3;

/**
 * Neutral master chain knob values: filter centered, all sends off,
 * compressor threshold fully open (minimal compression), unity volume.
 *
 * Deliberately hand-pinned rather than derived from init(): these are
 * golden-stability snapshots, so golden renders cannot silently shift when
 * the app's default preset changes. compRatio deliberately differs from the
 * app default (50 here vs init()'s ~57.14) - the golden baselines were
 * captured against this value. Any edit here invalidates them, so change
 * these values only on purpose.
 */
const DEFAULT_MASTER_PARAMS: MasterChainParams = {
  filter: 50,
  saturation: 0,
  phaser: 0,
  reverb: 0,
  compThreshold: 100,
  compRatio: 50,
  compAttack: 50,
  compMix: 70,
  masterVolume: 92,
};

interface RenderFixtureOptions {
  pattern: Pattern;
  instruments: InstrumentData[];
  /** Blob URLs, one per instrument (parallel array). */
  sampleUrls: string[];
  bpm: number;
  /** 0-100 knob value. */
  swing?: number;
  bars?: number;
  chain?: PatternChain;
  chainEnabled?: boolean;
  variation?: VariationId;
  masterParams?: Partial<MasterChainParams>;
}

/**
 * Constructs a fresh (non-singleton) AudioEngine and pushes the fixture
 * state through the real engine commands: pattern, playback config,
 * per-channel play/continuous params (knob values converted to domain at
 * the boundary), master settings, tempo, swing, and the kit.
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

  const mergedMasterParams: MasterChainParams = {
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
        instrumentKnobsToPlayParams(instrument.params),
      );
      engine.setChannelContinuousParams(
        index,
        instrumentKnobsToContinuousParams(instrument.params),
      );
    });

    engine.setMasterSettings(mapParamsToSettings(mergedMasterParams));
    engine.setTempo(bpm);
    engine.setSwing(transportSwingKnobToDomain(swing));

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
