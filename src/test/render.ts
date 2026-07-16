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
 * engine.renderWav. Instruments are CANONICAL (the store-facing units), so
 * they cross the boundary through the canonical-to-engine bridge
 * (engine-params.ts) exactly like production. The master chain and swing are
 * still supplied to this harness as 0-100 knob positions - the golden and
 * stem specs pin knob values that must not change - so this file owns a small
 * frozen knob-to-canonical conversion (the pre-flip bridge's master math) and
 * then routes through the same canonical bridge. The engine inputs it
 * produces are byte-identical to the pre-flip harness.
 */

import { getContext } from "tone/build/esm/index";

import {
  instrumentContinuousParams,
  instrumentPlayParams,
  mapMasterToSettings,
  type MasterChainCanonical,
} from "@/core/audio/bridge/engine-params";
import { toKitSampleDescriptors } from "@/core/audio/bridge/kit-descriptors";
import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import { AudioEngine } from "@/core/audio/engine";
import {
  MASTER_COMP_ATTACK_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_VOLUME_RANGE,
  TRANSPORT_SWING_MAX,
} from "@/core/audio/engine/constants";
import type {
  Pattern,
  PatternChain,
  VariationId,
} from "@/core/audio/engine/pattern-types";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import { lerp } from "@/shared/lib/utils";

/**
 * Historical extra render time after the last bar. Kept exported for
 * interface stability: renders go through engine.renderWav with
 * includeTail=false, so buffers end exactly on the bar line.
 */
const RENDER_TAIL_SECONDS = 0.3;

/**
 * Master chain as the 0-100 knob positions the golden and stem specs pin.
 *
 * The stores hold canonical master units now; this knob shape is a FROZEN
 * test-harness boundary that keeps the pinned golden values (NO_COMP,
 * { reverb: 100 }, ...) meaning what they meant pre-flip. masterKnobsToCanonical
 * converts it back to canonical before the engine sees it.
 */
interface MasterChainParams {
  /** Split-filter position (0-100). */
  filter: number;
  saturation: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compMix: number;
  masterVolume: number;
}

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

// --- Frozen knob-to-canonical master math (the pre-flip bridge) -------------
//
// Reproduces the deleted knob-to-domain/transform curves for the master chain
// exactly, so the engine sees the same values the golden baselines were
// captured against. Confined to this test harness; no live store, bridge, or
// engine holds a 0-100 knob value.

/** Exponent of the pre-flip perceptual knob curve (compressor attack). */
const KNOB_EXPONENTIAL_CURVE_POWER = 2;
/** Split-filter geometry from the retired widget curve. */
const SPLIT_FILTER_CURVE_POWER = 2;
const KNOB_ROTATION_THRESHOLD_L = 49;
const KNOB_ROTATION_THRESHOLD_R = 50;

/**
 * Split-filter position (0-100) to the canonical `{ side, cutoffHz }`, using
 * the pre-flip curve: 0-49 sweeps the low-pass side, 50-100 the high-pass
 * side, each rescaled to 0-1 and shaped with a power-2 curve over
 * MASTER_FILTER_RANGE. Position 50 is the open extreme (highpass at 0 Hz).
 */
function splitFilterPositionToCanonical(position: number): CanonicalFilter {
  const lowPass = position <= KNOB_ROTATION_THRESHOLD_L;
  const [min, max] = MASTER_FILTER_RANGE;
  const sidePosition =
    ((lowPass ? position : position - KNOB_ROTATION_THRESHOLD_R) /
      KNOB_ROTATION_THRESHOLD_L) *
    100;
  const t = sidePosition / 100;
  const cutoffHz = min + Math.pow(t, SPLIT_FILTER_CURVE_POWER) * (max - min);
  return { side: lowPass ? "lowpass" : "highpass", cutoffHz };
}

/**
 * Maps the harness knob master params to the canonical master chain the
 * engine bridge consumes. Linear knob curves rescale to their canonical
 * range; the compressor attack keeps its power-2 curve; masterVolume treats
 * knob 0 as silence (-Infinity); the two macros stay 0-1 wet fractions that
 * engine-params expands to their engine companions.
 */
function masterKnobsToCanonical(
  params: MasterChainParams,
): MasterChainCanonical {
  return {
    filter: splitFilterPositionToCanonical(params.filter),
    saturation: params.saturation / 100,
    phaser: params.phaser / 100,
    reverb: params.reverb / 100,
    compThreshold: lerp(
      params.compThreshold / 100,
      MASTER_COMP_THRESHOLD_RANGE[0],
      MASTER_COMP_THRESHOLD_RANGE[1],
    ),
    compRatio: Math.round(
      lerp(
        params.compRatio / 100,
        MASTER_COMP_RATIO_RANGE[0],
        MASTER_COMP_RATIO_RANGE[1],
      ),
    ),
    compAttack: lerp(
      Math.pow(params.compAttack / 100, KNOB_EXPONENTIAL_CURVE_POWER),
      MASTER_COMP_ATTACK_RANGE[0],
      MASTER_COMP_ATTACK_RANGE[1],
    ),
    compMix: params.compMix / 100,
    masterVolume:
      params.masterVolume === 0
        ? -Infinity
        : lerp(
            params.masterVolume / 100,
            MASTER_VOLUME_RANGE[0],
            MASTER_VOLUME_RANGE[1],
          ),
  };
}

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
        instrumentPlayParams(instrument.params),
      );
      engine.setChannelContinuousParams(
        index,
        instrumentContinuousParams(instrument.params),
      );
    });

    engine.setMasterSettings(
      mapMasterToSettings(masterKnobsToCanonical(mergedMasterParams)),
    );
    engine.setTempo(bpm);
    // Knob (0-100) to the canonical Tone swing fraction (0-TRANSPORT_SWING_MAX),
    // matching the retired transportSwingKnobToDomain exactly.
    engine.setSwing((swing / 100) * TRANSPORT_SWING_MAX);

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
export type { RenderFixtureOptions, MasterChainParams };
