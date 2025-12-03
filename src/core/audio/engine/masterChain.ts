import type { RefObject } from "react";
import {
  BiquadFilter,
  Chebyshev,
  Compressor,
  Delay,
  Filter,
  Gain,
  getDestination,
  Limiter,
  Phaser,
  Reverb,
  type ToneAudioNode,
} from "tone/build/esm/index";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import { MasterChainParams } from "@/features/master-bus/types/master";
import {
  compAttackMapping,
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
  masterVolumeMapping,
  phaserWetMapping,
  reverbDecayMapping,
  reverbWetMapping,
  saturationWetMapping,
  splitFilterMapping,
} from "@/shared/knob/lib/mapping";
import { KNOB_ROTATION_THRESHOLD_L } from "@/shared/knob/lib/transform";
import {
  MASTER_COMP_KNEE,
  MASTER_COMP_LATENCY,
  MASTER_COMP_MAKEUP_GAIN,
  MASTER_COMP_RELEASE,
  MASTER_DRUM_SATURATION_ORDER,
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
  MASTER_TAPE_SATURATION_ORDER,
  MASTER_TAPE_SATURATION_WET,
} from "./constants";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface MasterChainRuntimes {
  // Compressor section (front of chain with parallel compression)
  compressor: Compressor;
  compMakeupGain: Gain; // Fixed makeup gain after compressor
  compWetGain: Gain; // Controls wet (compressed) signal level
  compDryDelay: Delay; // Compensates for compressor latency
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
  tapeWarmth: Chebyshev; // Subtle fixed tape warmth (always on)
  saturation: Chebyshev; // User-controllable crunchier saturation for drums
  presenceDip: BiquadFilter; // Tames harsh 3-5kHz range
  highShelf: BiquadFilter; // Rolls off harsh highs
  limiter: Limiter;
}

export type MasterChainSettings = {
  // Split filter settings (single filter that switches type, same as instrument filter)
  filter: number; // Raw knob value 0-100
  saturationWet: number;
  phaserWet: number;
  reverbWet: number;
  reverbDecay: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
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
    { name: "compDryDelay", node: runtimes.current.compDryDelay },
    { name: "compDryGain", node: runtimes.current.compDryGain },
    { name: "lowPassFilter", node: runtimes.current.lowPassFilter },
    { name: "highPassFilter", node: runtimes.current.highPassFilter },
    { name: "phaserPreFilter", node: runtimes.current.phaserPreFilter },
    { name: "phaser", node: runtimes.current.phaser },
    { name: "phaserSendGain", node: runtimes.current.phaserSendGain },
    { name: "reverbPreFilter", node: runtimes.current.reverbPreFilter },
    { name: "reverb", node: runtimes.current.reverb },
    { name: "reverbSendGain", node: runtimes.current.reverbSendGain },
    { name: "tapeWarmth", node: runtimes.current.tapeWarmth },
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
  // Chain core nodes
  instrument.samplerNode.chain(
    instrument.envelopeNode,
    instrument.filterNode,
    instrument.pannerNode,
  );

  // Connect instrument output to compressor section (parallel compression)
  // Signal splits: wet path through compressor, dry path with latency compensation
  // Multiple instruments connecting here are naturally summed by Web Audio
  instrument.pannerNode.connect(master.compressor); // Wet path (post-pan)
  instrument.pannerNode.connect(master.compDryDelay); // Dry path (with latency compensation)
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
  // Dry path: delay (latency compensation) → dry gain
  masterChain.compDryDelay.connect(masterChain.compDryGain);
  // Both wet and dry paths sum into the low pass filter
  masterChain.compWetGain.connect(masterChain.lowPassFilter);
  masterChain.compDryGain.connect(masterChain.lowPassFilter);

  // Input filters (after compressor section)
  masterChain.lowPassFilter.chain(masterChain.highPassFilter);

  // Main signal goes to tape warmth (subtle, always on)
  masterChain.highPassFilter.connect(masterChain.tapeWarmth);

  // Parallel phaser send: filtered to keep sub bass clean
  masterChain.highPassFilter.connect(masterChain.phaserPreFilter);
  masterChain.phaserPreFilter.chain(
    masterChain.phaser,
    masterChain.phaserSendGain,
  );
  masterChain.phaserSendGain.connect(masterChain.tapeWarmth);

  // Parallel reverb send: filtered to keep low end dry
  masterChain.highPassFilter.connect(masterChain.reverbPreFilter);
  masterChain.reverbPreFilter.chain(
    masterChain.reverb,
    masterChain.reverbSendGain,
  );
  masterChain.reverbSendGain.connect(masterChain.tapeWarmth);

  // Output chain: tape warmth → drum saturation (user-controllable) → EQ → limiter
  masterChain.tapeWarmth.chain(
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
  // Split filter: single filter that switches between lowpass and highpass (same as instrument filter)
  const filterType: BiquadFilterType =
    settings.filter <= KNOB_ROTATION_THRESHOLD_L ? "lowpass" : "highpass";
  const filterFrequency = splitFilterMapping.knobToDomain(settings.filter);

  const lowPassFilter = new Filter(filterFrequency, filterType);
  // highPassFilter is kept for chain compatibility but acts as pass-through
  const highPassFilter = new Filter(MASTER_FILTER_RANGE[0], "highpass");

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
    attack: settings.compAttack,
    release: MASTER_COMP_RELEASE,
    knee: MASTER_COMP_KNEE, // Hard knee for punchy transients
  });

  // Makeup gain compensates for gain reduction (fixed at +1.5dB)
  const compMakeupGain = new Gain(Math.pow(10, MASTER_COMP_MAKEUP_GAIN / 20));

  // Parallel compression wet/dry mix
  const compWetGain = new Gain(settings.compMix);
  // Delay compensates for compressor lookahead latency to keep wet/dry in phase
  const compDryDelay = new Delay(MASTER_COMP_LATENCY);
  const compDryGain = new Gain(1 - settings.compMix);

  // Tape warmth: subtle fixed saturation (always on, not user-controllable)
  const tapeWarmth = new Chebyshev({
    order: MASTER_TAPE_SATURATION_ORDER,
    wet: MASTER_TAPE_SATURATION_WET,
  });

  // Drum saturation: crunchier user-controllable saturation
  const saturation = new Chebyshev({
    order: MASTER_DRUM_SATURATION_ORDER,
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

  return {
    compressor,
    compMakeupGain,
    compWetGain,
    compDryDelay,
    compDryGain,
    lowPassFilter,
    highPassFilter,
    phaserPreFilter,
    phaser,
    phaserSendGain,
    reverbPreFilter,
    reverb,
    reverbSendGain,
    tapeWarmth,
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
    filter: params.filter, // Pass raw knob value for split filter logic
    saturationWet: saturationWetMapping.knobToDomain(params.saturation),
    phaserWet: phaserWetMapping.knobToDomain(params.phaser),
    reverbWet: reverbWetMapping.knobToDomain(params.reverb),
    reverbDecay: reverbDecayMapping.knobToDomain(params.reverb),
    compThreshold: compThresholdMapping.knobToDomain(params.compThreshold),
    compRatio: compRatioMapping.knobToDomain(params.compRatio),
    compAttack: compAttackMapping.knobToDomain(params.compAttack),
    compMix: compMixMapping.knobToDomain(params.compMix),
    masterVolume: masterVolumeMapping.knobToDomain(params.masterVolume),
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
  runtimes.compressor.attack.value = settings.compAttack;
  // Parallel compression wet/dry mix
  runtimes.compWetGain.gain.value = settings.compMix;
  runtimes.compDryGain.gain.value = 1 - settings.compMix;

  // Split filter settings (same as instrument filter implementation)
  runtimes.lowPassFilter.type =
    settings.filter <= KNOB_ROTATION_THRESHOLD_L ? "lowpass" : "highpass";
  runtimes.lowPassFilter.frequency.value = splitFilterMapping.knobToDomain(
    settings.filter,
  );
  // highPassFilter stays as pass-through (no need to update)

  // Saturation wet/dry mix
  runtimes.saturation.wet.value = settings.saturationWet;

  // Effect send settings
  runtimes.phaserSendGain.gain.value = settings.phaserWet;
  runtimes.reverbSendGain.gain.value = settings.reverbWet;
  runtimes.reverb.decay = settings.reverbDecay;

  // Master volume is applied directly to the global destination.
  getDestination().volume.value = settings.masterVolume;
}
