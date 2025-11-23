import type { RefObject } from "react";
import {
  BiquadFilter,
  Chebyshev,
  Compressor,
  Filter,
  Gain,
  getDestination,
  Limiter,
  Phaser,
  Reverb,
  type ToneAudioNode,
} from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/knobTransforms";
import type { InstrumentRuntime } from "@/types/instrument";
import type { MasterChainParams } from "@/types/preset";
import {
  MASTER_COMP_ATTACK,
  MASTER_COMP_MAKEUP_GAIN,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_RELEASE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_HIGH_SHELF_FREQ,
  MASTER_HIGH_SHELF_GAIN,
  MASTER_LIMITER_THRESHOLD,
  MASTER_PHASER_BASE_FREQUENCY,
  MASTER_PHASER_FREQUENCY,
  MASTER_PHASER_OCTAVES,
  MASTER_PHASER_PRE_FILTER_FREQ,
  MASTER_PHASER_Q,
  MASTER_PHASER_WET_RANGE,
  MASTER_PRESENCE_FREQ,
  MASTER_PRESENCE_GAIN,
  MASTER_PRESENCE_Q,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_REVERB_PRE_FILTER_FREQ,
  MASTER_REVERB_WET_RANGE,
  MASTER_SATURATION_AMOUNT,
  MASTER_SATURATION_WET,
  MASTER_VOLUME_RANGE,
} from "./constants";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MasterChainRuntimes {
  // Compressor section (front of chain with parallel compression)
  compressor: Compressor;
  compMakeupGain: Gain; // Fixed makeup gain after compressor
  compWetGain: Gain; // Controls wet (compressed) signal level
  compDryGain: Gain; // Controls dry (uncompressed) signal level
  // Filters
  lowPassFilter: Filter;
  highPassFilter: Filter;
  // Phaser send
  phaserPreFilter: Filter; // High-pass to keep sub bass out of phaser
  phaser: Phaser;
  phaserSendGain: Gain; // Controls phaser send amount
  // Reverb send
  reverbPreFilter: Filter; // High-pass to keep low end out of reverb
  reverb: Reverb;
  reverbSendGain: Gain; // Controls reverb send amount
  // Output processing
  saturation: Chebyshev; // Subtle harmonic warmth
  presenceDip: BiquadFilter; // Tames harsh 3-5kHz range
  highShelf: BiquadFilter; // Rolls off harsh highs
  limiter: Limiter;
}

export type MasterChainSettings = {
  lowPassFrequency: number;
  highPassFrequency: number;
  phaserWet: number;
  reverbWet: number;
  reverbDecay: number;
  compThreshold: number;
  compRatio: number;
  compMix: number; // 0-1 wet/dry mix for parallel compression
  masterVolume: number;
};

// -----------------------------------------------------------------------------
// Public API: creation / lifecycle
// -----------------------------------------------------------------------------

/**
 * Initializes master chain nodes with settings and chains them to a destination.
 * Shared between online and offline contexts.
 *
 * @param params The master chain parameters from the store
 * @param destination The destination node (getDestination() for online, offline destination for export)
 * @returns The initialized master chain runtimes
 */
export async function initializeMasterChain(
  params: MasterChainParams,
  destination: ToneAudioNode,
): Promise<MasterChainRuntimes> {
  const settings = mapParamsToSettings(params);
  const nodes = await buildMasterChainNodes(settings);
  applySettingsToRuntimes(nodes, settings);
  chainMasterChainNodes(nodes, destination);
  return nodes;
}

/**
 * Creates and initializes all master chain audio runtimes.
 * Disposes existing runtimes before creating new ones to prevent memory leaks.
 */
export async function createMasterChainRuntimes(
  runtimes: RefObject<MasterChainRuntimes | null>,
  params: MasterChainParams,
): Promise<void> {
  disposeMasterChainRuntimes(runtimes);
  runtimes.current = await initializeMasterChain(params, getDestination());
}

/**
 * Updates master chain parameter values on existing runtimes.
 */
export function updateMasterChainParams(
  runtimes: MasterChainRuntimes,
  params: MasterChainParams,
): void {
  const settings = mapParamsToSettings(params);
  applySettingsToRuntimes(runtimes, settings);
}

/**
 * Disposes all master chain runtimes and clears the ref.
 * Handles errors gracefully to prevent crashes during cleanup.
 */
export function disposeMasterChainRuntimes(
  runtimes: RefObject<MasterChainRuntimes | null>,
): void {
  if (!runtimes.current) return;

  const nodesToDispose = [
    { name: "compressor", node: runtimes.current.compressor },
    { name: "compMakeupGain", node: runtimes.current.compMakeupGain },
    { name: "compWetGain", node: runtimes.current.compWetGain },
    { name: "compDryGain", node: runtimes.current.compDryGain },
    { name: "lowPassFilter", node: runtimes.current.lowPassFilter },
    { name: "highPassFilter", node: runtimes.current.highPassFilter },
    { name: "phaserPreFilter", node: runtimes.current.phaserPreFilter },
    { name: "phaser", node: runtimes.current.phaser },
    { name: "phaserSendGain", node: runtimes.current.phaserSendGain },
    { name: "reverbPreFilter", node: runtimes.current.reverbPreFilter },
    { name: "reverb", node: runtimes.current.reverb },
    { name: "reverbSendGain", node: runtimes.current.reverbSendGain },
    { name: "saturation", node: runtimes.current.saturation },
    { name: "presenceDip", node: runtimes.current.presenceDip },
    { name: "highShelf", node: runtimes.current.highShelf },
    { name: "limiter", node: runtimes.current.limiter },
  ];

  for (const { name, node } of nodesToDispose) {
    try {
      node.dispose();
    } catch (error) {
      console.warn(`Error disposing ${name}:`, error);
    }
  }

  runtimes.current = null;
}

// -----------------------------------------------------------------------------
// Public API: connecting instruments / master chain
// -----------------------------------------------------------------------------

/**
 * Connects an instrument runtime to the master chain.
 * Only connects instrument output to the first master node - the master chain
 * itself should already be chained to the destination via chainMasterChainNodes.
 */
export function connectInstrumentRuntime(
  instrument: InstrumentRuntime,
  master: MasterChainRuntimes,
): void {
  // Disconnect existing links to avoid duplicated chains when re-connecting
  instrument.samplerNode.disconnect();
  instrument.envelopeNode.disconnect();
  instrument.filterNode.disconnect();
  instrument.pannerNode.disconnect();

  // Chain instrument nodes together
  instrument.samplerNode.chain(
    instrument.envelopeNode,
    instrument.filterNode,
    instrument.pannerNode,
  );

  // Connect instrument output to compressor section (parallel compression)
  // Signal splits: wet path through compressor, dry path bypasses
  // Multiple instruments connecting here are naturally summed by Web Audio
  instrument.pannerNode.connect(master.compressor); // Wet path
  instrument.pannerNode.connect(master.compDryGain); // Dry path
}

/**
 * Connects all instrument runtimes to the master chain.
 */
export function connectInstrumentsToMasterChain(
  instrumentRuntimes: InstrumentRuntime[],
  masterChainRuntimes: MasterChainRuntimes,
): void {
  instrumentRuntimes.forEach((inst) =>
    connectInstrumentRuntime(inst, masterChainRuntimes),
  );
}

/**
 * Chains master chain nodes in the correct order.
 * Shared between online and offline contexts.
 *
 * @param masterChain The master chain runtimes.
 * @param destination The destination node to chain to
 *        (e.g., getDestination() for online, or offline destination for export).
 */
export function chainMasterChainNodes(
  masterChain: MasterChainRuntimes,
  destination: ToneAudioNode,
): void {
  // Compressor section (front of chain with parallel compression)
  // Wet path: compressor → makeup gain → wet gain
  masterChain.compressor.chain(
    masterChain.compMakeupGain,
    masterChain.compWetGain,
  );
  // Both wet and dry paths sum into the low pass filter
  masterChain.compWetGain.connect(masterChain.lowPassFilter);
  masterChain.compDryGain.connect(masterChain.lowPassFilter);

  // Input filters (after compressor section)
  masterChain.lowPassFilter.chain(masterChain.highPassFilter);

  // Main signal goes to saturation
  masterChain.highPassFilter.connect(masterChain.saturation);

  // Parallel phaser send: filtered to keep sub bass clean
  masterChain.highPassFilter.connect(masterChain.phaserPreFilter);
  masterChain.phaserPreFilter.chain(
    masterChain.phaser,
    masterChain.phaserSendGain,
  );
  masterChain.phaserSendGain.connect(masterChain.saturation);

  // Parallel reverb send: filtered to keep low end dry
  masterChain.highPassFilter.connect(masterChain.reverbPreFilter);
  masterChain.reverbPreFilter.chain(
    masterChain.reverb,
    masterChain.reverbSendGain,
  );
  masterChain.reverbSendGain.connect(masterChain.saturation);

  // Output chain: saturation adds warmth, EQ tames harshness
  masterChain.saturation.chain(
    masterChain.presenceDip,
    masterChain.highShelf,
    masterChain.limiter,
    destination,
  );
}

// -----------------------------------------------------------------------------
// Public API: node creation / settings
// -----------------------------------------------------------------------------

/**
 * Builds the master chain audio nodes from settings.
 * Pure function that only creates nodes – settings computation is separate.
 * Shared between online and offline contexts.
 */
export async function buildMasterChainNodes(
  settings: MasterChainSettings,
): Promise<MasterChainRuntimes> {
  const lowPassFilter = new Filter(settings.lowPassFrequency, "lowpass");
  const highPassFilter = new Filter(settings.highPassFrequency, "highpass");

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

  // High-pass filter before reverb keeps kick/bass dry
  const reverbPreFilter = new Filter(MASTER_REVERB_PRE_FILTER_FREQ, "highpass");

  const reverb = new Reverb({
    decay: settings.reverbDecay,
    wet: 1, // 100% wet - dry signal is handled by parallel path
  });
  await reverb.generate(); // Required before first use

  // Send gain controls how much reverb is mixed back in
  const reverbSendGain = new Gain(settings.reverbWet);

  // Compressor with API 2500-style settings
  const compressor = new Compressor({
    threshold: settings.compThreshold,
    ratio: settings.compRatio,
    attack: MASTER_COMP_ATTACK,
    release: MASTER_COMP_RELEASE,
  });

  // Makeup gain compensates for gain reduction (fixed at +1.5dB)
  const compMakeupGain = new Gain(Math.pow(10, MASTER_COMP_MAKEUP_GAIN / 20));

  // Parallel compression wet/dry mix
  const compWetGain = new Gain(settings.compMix);
  const compDryGain = new Gain(1 - settings.compMix);

  // Subtle saturation for analog warmth
  const saturation = new Chebyshev({
    order: MASTER_SATURATION_AMOUNT,
    wet: MASTER_SATURATION_WET,
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

  return {
    compressor,
    compMakeupGain,
    compWetGain,
    compDryGain,
    lowPassFilter,
    highPassFilter,
    phaserPreFilter,
    phaser,
    phaserSendGain,
    reverbPreFilter,
    reverb,
    reverbSendGain,
    saturation,
    presenceDip,
    highShelf,
    limiter,
  };
}

/**
 * Maps knob params → concrete numeric settings.
 */
export function mapParamsToSettings(
  params: MasterChainParams,
): MasterChainSettings {
  return {
    lowPassFrequency: transformKnobValueExponential(
      params.lowPass,
      MASTER_FILTER_RANGE,
    ),
    highPassFrequency: transformKnobValueExponential(
      params.highPass,
      MASTER_FILTER_RANGE,
    ),
    phaserWet: transformKnobValue(params.phaser, MASTER_PHASER_WET_RANGE),
    reverbWet: transformKnobValue(params.reverb, MASTER_REVERB_WET_RANGE),
    reverbDecay: transformKnobValue(params.reverb, MASTER_REVERB_DECAY_RANGE),
    compThreshold: transformKnobValue(
      params.compThreshold,
      MASTER_COMP_THRESHOLD_RANGE,
    ),
    // Allow fractional ratios like 1.5 (API 2500 style)
    compRatio: transformKnobValue(params.compRatio, MASTER_COMP_RATIO_RANGE),
    // Convert from 0-100 percentage to 0-1 for audio processing
    compMix: transformKnobValue(params.compMix, MASTER_COMP_MIX_RANGE) / 100,
    // Knob at 0 = true silence (-Infinity dB), otherwise use normal transform
    masterVolume:
      params.masterVolume === 0
        ? -Infinity
        : transformKnobValue(params.masterVolume, MASTER_VOLUME_RANGE),
  };
}

/**
 * Applies master chain settings to runtime nodes.
 * Shared between online and offline contexts.
 */
function applySettingsToRuntimes(
  runtimes: MasterChainRuntimes,
  settings: MasterChainSettings,
): void {
  // Compressor settings
  runtimes.compressor.threshold.value = settings.compThreshold;
  runtimes.compressor.ratio.value = settings.compRatio;
  // Parallel compression wet/dry mix
  runtimes.compWetGain.gain.value = settings.compMix;
  runtimes.compDryGain.gain.value = 1 - settings.compMix;

  // Filter settings
  runtimes.lowPassFilter.frequency.value = settings.lowPassFrequency;
  runtimes.highPassFilter.frequency.value = settings.highPassFrequency;

  // Effect send settings
  runtimes.phaserSendGain.gain.value = settings.phaserWet;
  runtimes.reverbSendGain.gain.value = settings.reverbWet;
  runtimes.reverb.decay = settings.reverbDecay;

  // Master volume is applied directly to the global destination.
  getDestination().volume.value = settings.masterVolume;
}
