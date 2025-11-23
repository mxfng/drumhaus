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
  lowPassFilter: Filter;
  highPassFilter: Filter;
  phaserPreFilter: Filter; // High-pass to keep sub bass out of phaser
  phaser: Phaser;
  phaserSendGain: Gain; // Controls phaser send amount
  reverbPreFilter: Filter; // High-pass to keep low end out of reverb
  reverb: Reverb;
  reverbSendGain: Gain; // Controls reverb send amount
  saturation: Chebyshev; // Subtle harmonic warmth
  presenceDip: BiquadFilter; // Tames harsh 3-5kHz range
  highShelf: BiquadFilter; // Rolls off harsh highs
  compressor: Compressor;
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
    { name: "compressor", node: runtimes.current.compressor },
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

  // Connect instrument output to the first master chain node (summing point)
  // Multiple instruments connecting here are naturally summed by Web Audio
  instrument.pannerNode.connect(master.lowPassFilter);
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
  // Input filters
  masterChain.lowPassFilter.chain(masterChain.highPassFilter);

  // Dry signal (all frequencies) goes directly to compressor
  masterChain.highPassFilter.connect(masterChain.compressor);

  // Parallel phaser send: filtered to keep sub bass clean
  masterChain.highPassFilter.connect(masterChain.phaserPreFilter);
  masterChain.phaserPreFilter.chain(
    masterChain.phaser,
    masterChain.phaserSendGain,
  );
  masterChain.phaserSendGain.connect(masterChain.compressor);

  // Parallel reverb send: filtered to keep low end dry
  masterChain.highPassFilter.connect(masterChain.reverbPreFilter);
  masterChain.reverbPreFilter.chain(
    masterChain.reverb,
    masterChain.reverbSendGain,
  );
  masterChain.reverbSendGain.connect(masterChain.compressor);

  // Output chain: saturation adds warmth, EQ tames harshness
  masterChain.compressor.chain(
    masterChain.saturation,
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

  const compressor = new Compressor({
    threshold: settings.compThreshold,
    ratio: settings.compRatio,
    attack: MASTER_COMP_ATTACK,
    release: MASTER_COMP_RELEASE,
  });

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
    compressor,
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
    compRatio: Math.floor(
      transformKnobValue(params.compRatio, MASTER_COMP_RATIO_RANGE),
    ),
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
  runtimes.lowPassFilter.frequency.value = settings.lowPassFrequency;
  runtimes.highPassFilter.frequency.value = settings.highPassFrequency;
  runtimes.phaserSendGain.gain.value = settings.phaserWet;

  runtimes.reverbSendGain.gain.value = settings.reverbWet;
  runtimes.reverb.decay = settings.reverbDecay;

  runtimes.compressor.threshold.value = settings.compThreshold;
  runtimes.compressor.ratio.value = settings.compRatio;

  // Master volume is applied directly to the global destination.
  getDestination().volume.value = settings.masterVolume;
}
