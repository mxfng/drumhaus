import {
  BiquadFilter,
  Compressor,
  Delay,
  Distortion,
  Filter,
  Gain,
  Limiter,
  Phaser,
  Reverb,
} from "tone/build/esm/index";

import {
  MASTER_COMP_KNEE,
  MASTER_COMP_LATENCY,
  MASTER_COMP_MAKEUP_GAIN,
  MASTER_COMP_RELEASE,
  MASTER_FILTER_RANGE,
  MASTER_HIGH_SHELF_FREQ,
  MASTER_HIGH_SHELF_GAIN,
  MASTER_LIMITER_THRESHOLD,
  MASTER_PHASER_BASE_FREQUENCY,
  MASTER_PHASER_FREQUENCY,
  MASTER_PHASER_OCTAVES,
  MASTER_PHASER_PRE_FILTER_FREQ,
  MASTER_PHASER_Q,
  MASTER_PRESENCE_FREQ,
  MASTER_PRESENCE_GAIN,
  MASTER_PRESENCE_Q,
  MASTER_REVERB_PRE_FILTER_FREQ,
  MASTER_SATURATION_OVERSAMPLE,
} from "../../constants";
import { applySplitFilterWithRamp } from "../splitFilter";
import { MasterChainRuntimes, MasterChainSettings } from "./types";

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Builds the master chain audio nodes from settings.
 * Orchestrates all FX section creation.
 * Shared between online and offline contexts.
 */
export async function buildMasterChainNodes(
  settings: MasterChainSettings,
): Promise<MasterChainRuntimes> {
  const compressorNodes = createCompressorSection(settings);
  const filterNodes = createFilterSection(settings);
  const phaserNodes = createPhaserSection(settings);
  const reverbNodes = await createReverbSection(settings);
  const outputNodes = createOutputSection(settings);

  return {
    ...compressorNodes,
    ...filterNodes,
    ...phaserNodes,
    ...reverbNodes,
    ...outputNodes,
  };
}

/**
 * Disposes all master chain runtimes.
 * Handles errors gracefully to prevent crashes during cleanup.
 */
export function disposeMasterChainNodes(
  runtimes: MasterChainRuntimes | null,
): void {
  if (!runtimes) return;

  const nodesToDispose = [
    { name: "compressor", node: runtimes.compressor },
    { name: "compMakeupGain", node: runtimes.compMakeupGain },
    { name: "compWetGain", node: runtimes.compWetGain },
    { name: "compDryDelay", node: runtimes.compDryDelay },
    { name: "compDryGain", node: runtimes.compDryGain },
    { name: "lowPassFilter", node: runtimes.lowPassFilter },
    { name: "highPassFilter", node: runtimes.highPassFilter },
    { name: "phaserPreFilter", node: runtimes.phaserPreFilter },
    { name: "phaser", node: runtimes.phaser },
    { name: "phaserSendGain", node: runtimes.phaserSendGain },
    { name: "reverbPreFilter", node: runtimes.reverbPreFilter },
    { name: "reverb", node: runtimes.reverb },
    { name: "reverbSendGain", node: runtimes.reverbSendGain },
    { name: "saturation", node: runtimes.saturation },
    { name: "presenceDip", node: runtimes.presenceDip },
    { name: "highShelf", node: runtimes.highShelf },
    { name: "limiter", node: runtimes.limiter },
  ];

  for (const { name, node } of nodesToDispose) {
    try {
      node.dispose();
    } catch (error) {
      console.warn(`Error disposing ${name}:`, error);
    }
  }
}

// -----------------------------------------------------------------------------
// Compressor Section
// -----------------------------------------------------------------------------

/**
 * Creates parallel compression section with API 2500-style settings.
 * Signal splits into wet (compressed) and dry paths, then recombines.
 */
function createCompressorSection(settings: MasterChainSettings) {
  // Main compressor with punchy transient response
  const compressor = new Compressor({
    threshold: settings.compThreshold,
    ratio: settings.compRatio,
    attack: settings.compAttack,
    release: MASTER_COMP_RELEASE,
    knee: MASTER_COMP_KNEE, // Hard knee for punchy transients
  });

  // Fixed makeup gain compensates for gain reduction (+1.5dB)
  const compMakeupGain = new Gain(Math.pow(10, MASTER_COMP_MAKEUP_GAIN / 20));

  // Parallel compression wet/dry mix
  const compWetGain = new Gain(settings.compMix);
  const compDryGain = new Gain(1 - settings.compMix);

  // Delay compensates for compressor lookahead latency to keep wet/dry in phase
  const compDryDelay = new Delay(MASTER_COMP_LATENCY);

  return {
    compressor,
    compMakeupGain,
    compWetGain,
    compDryDelay,
    compDryGain,
  };
}

// -----------------------------------------------------------------------------
// Filter Section
// -----------------------------------------------------------------------------

/**
 * Creates split filter section (LP on left, HP on right).
 * Uses dedicated nodes to avoid type switching artifacts.
 */
function createFilterSection(settings: MasterChainSettings) {
  const lowPassFilter = new Filter(MASTER_FILTER_RANGE[1], "lowpass");
  const highPassFilter = new Filter(MASTER_FILTER_RANGE[0], "highpass");

  // Apply initial filter position
  applySplitFilterWithRamp(lowPassFilter, highPassFilter, settings.filter, {
    minFrequency: MASTER_FILTER_RANGE[0],
    maxFrequency: MASTER_FILTER_RANGE[1],
  });

  return { lowPassFilter, highPassFilter };
}

// -----------------------------------------------------------------------------
// Phaser Section
// -----------------------------------------------------------------------------

/**
 * Creates phaser effect with parallel send architecture.
 * Pre-filter keeps sub bass out of modulation for cleaner low end.
 */
function createPhaserSection(settings: MasterChainSettings) {
  // High-pass filter before phaser keeps sub bass clean
  const phaserPreFilter = new Filter(MASTER_PHASER_PRE_FILTER_FREQ, "highpass");

  const phaser = new Phaser({
    frequency: MASTER_PHASER_FREQUENCY,
    octaves: MASTER_PHASER_OCTAVES,
    baseFrequency: MASTER_PHASER_BASE_FREQUENCY,
    Q: MASTER_PHASER_Q,
    wet: 1, // 100% wet - dry signal is handled by parallel path
  });

  // Send gain controls how much phaser is mixed back in
  const phaserSendGain = new Gain(settings.phaserWet);

  return { phaserPreFilter, phaser, phaserSendGain };
}

// -----------------------------------------------------------------------------
// Reverb Section
// -----------------------------------------------------------------------------

/**
 * Creates reverb effect with parallel send architecture.
 * Pre-filter keeps kick/bass dry for tight low end.
 */
async function createReverbSection(settings: MasterChainSettings) {
  // High-pass filter before reverb keeps kick/bass dry
  const reverbPreFilter = new Filter(MASTER_REVERB_PRE_FILTER_FREQ, "highpass");

  const reverb = new Reverb({
    decay: settings.reverbDecay,
    wet: 1, // 100% wet - dry signal is handled by parallel path
  });
  await reverb.generate(); // Required before first use

  // Send gain controls how much reverb is mixed back in
  const reverbSendGain = new Gain(settings.reverbWet);

  return { reverbPreFilter, reverb, reverbSendGain };
}

// -----------------------------------------------------------------------------
// Output Processing Section
// -----------------------------------------------------------------------------

/**
 * Creates output processing chain: saturation → EQ → limiting.
 * Tames harsh frequencies and prevents clipping.
 */
function createOutputSection(settings: MasterChainSettings) {
  // Drum saturation: crunchier user-controllable distortion
  const saturation = new Distortion({
    distortion: settings.saturationAmount,
    oversample: MASTER_SATURATION_OVERSAMPLE,
    wet: settings.saturationWet,
  });

  // Presence dip - tames harsh 3-5kHz "ice pick" frequencies
  const presenceDip = new BiquadFilter({
    frequency: MASTER_PRESENCE_FREQ,
    type: "peaking",
    Q: MASTER_PRESENCE_Q,
    gain: MASTER_PRESENCE_GAIN,
  });

  // High shelf rolloff - tames harsh hi-hats and sibilance
  const highShelf = new BiquadFilter({
    frequency: MASTER_HIGH_SHELF_FREQ,
    type: "highshelf",
    gain: MASTER_HIGH_SHELF_GAIN,
  });

  const limiter = new Limiter(MASTER_LIMITER_THRESHOLD);

  return { saturation, presenceDip, highShelf, limiter };
}
