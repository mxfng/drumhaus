import type { RefObject } from "react";
import {
  BiquadFilter,
  Compressor,
  Delay,
  Filter,
  Gain,
  getDestination,
  Limiter,
  Meter,
  Phaser,
  Reverb,
  WaveShaper,
  type ToneAudioNode,
} from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/knobTransforms";
import type { InstrumentRuntime } from "@/types/instrument";
import type { MasterChainParams } from "@/types/preset";
import {
  INFLATOR_CROSSOVER_FREQ,
  INFLATOR_CURVE,
  INFLATOR_INPUT_GAIN,
  INFLATOR_OUTPUT_GAIN,
  MASTER_COMP_ATTACK,
  MASTER_COMP_DEFAULT_MIX,
  MASTER_COMP_KNEE,
  MASTER_COMP_LATENCY,
  MASTER_COMP_MAKEUP_GAIN,
  MASTER_COMP_MIX_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_RELEASE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_INFLATOR_AMOUNT_DEFAULT,
  MASTER_INFLATOR_AMOUNT_RANGE,
  MASTER_LIMITER_THRESHOLD,
  MASTER_PHASER_BASE_FREQUENCY,
  MASTER_PHASER_FREQUENCY,
  MASTER_PHASER_OCTAVES,
  MASTER_PHASER_PRE_FILTER_FREQ,
  MASTER_PHASER_Q,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_REVERB_PRE_FILTER_FREQ,
  MASTER_REVERB_WET_RANGE,
  MASTER_SATURATION_DRIVE_DEFAULT,
  MASTER_SATURATION_DRIVE_RANGE_DB,
  MASTER_TAPE_DRIVE_DEFAULT,
  MASTER_TAPE_DRIVE_RANGE_DB,
  MASTER_VOLUME_RANGE,
  TAPE_LOW_SHELF_FREQ,
  TAPE_LOW_SHELF_GAIN,
  TAPE_PRESENCE_FREQ,
  TAPE_PRESENCE_GAIN,
  TAPE_PRESENCE_Q,
  TAPE_SATURATION_ASYMMETRY,
  TAPE_SATURATION_DRIVE,
  TAPE_SATURATION_OUTPUT,
  TUBE_ASYMMETRY,
  TUBE_DRIVE,
} from "./constants";

const dbToGain = (db: number) => Math.pow(10, db / 20);

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
  // Tape emulation (Studer A800 style - hidden processing)
  tapeLowShelf: BiquadFilter; // NAB curve bass warmth
  tapePresence: BiquadFilter; // HF driver character before saturation
  tapeDriveGain: Gain; // User-controlled drive into the tape shaper
  tapeSaturation: WaveShaper; // Soft saturation with even harmonics
  // Inflator (Oxford style - multiband upward compression)
  inflatorInputGain: Gain; // Drive into the effect
  inflatorLowPass: Filter; // Crossover low band
  inflatorHighPass: Filter; // Crossover high band
  inflatorLowShaper: WaveShaper; // Low band waveshaping
  inflatorHighShaper: WaveShaper; // High band waveshaping
  inflatorWetGain: Gain; // Wet signal level
  inflatorDryGain: Gain; // Dry signal level
  inflatorOutputGain: Gain; // Final output compensation
  // Tube saturation (Saturn 2 Clean Tube style)
  tubeDriveGain: Gain; // User-controlled drive into tube shaper
  tubeSaturation: WaveShaper; // Subtle even harmonics
  // Output processing
  masterVolumeGain: Gain; // Master volume applied before metering
  limiter: Limiter;
  outputMeter: Meter;
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
  tapeDriveGain: number;
  inflatorEffect: number;
  saturationDriveGain: number;
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
    { name: "tapeLowShelf", node: runtimes.current.tapeLowShelf },
    { name: "tapePresence", node: runtimes.current.tapePresence },
    { name: "tapeDriveGain", node: runtimes.current.tapeDriveGain },
    { name: "tapeSaturation", node: runtimes.current.tapeSaturation },
    { name: "inflatorInputGain", node: runtimes.current.inflatorInputGain },
    { name: "inflatorLowPass", node: runtimes.current.inflatorLowPass },
    { name: "inflatorHighPass", node: runtimes.current.inflatorHighPass },
    { name: "inflatorLowShaper", node: runtimes.current.inflatorLowShaper },
    { name: "inflatorHighShaper", node: runtimes.current.inflatorHighShaper },
    { name: "inflatorWetGain", node: runtimes.current.inflatorWetGain },
    { name: "inflatorDryGain", node: runtimes.current.inflatorDryGain },
    { name: "inflatorOutputGain", node: runtimes.current.inflatorOutputGain },
    { name: "tubeDriveGain", node: runtimes.current.tubeDriveGain },
    { name: "tubeSaturation", node: runtimes.current.tubeSaturation },
    { name: "masterVolumeGain", node: runtimes.current.masterVolumeGain },
    { name: "limiter", node: runtimes.current.limiter },
    { name: "outputMeter", node: runtimes.current.outputMeter },
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
  // Signal splits: wet path through compressor, dry path with latency compensation
  // Multiple instruments connecting here are naturally summed by Web Audio
  instrument.pannerNode.connect(master.compressor); // Wet path
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
 * compressor → tape → inflator → tubeSaturation →
 * filters → FX sends → limiter
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
  // Both wet and dry paths sum into tape emulation
  masterChain.compWetGain.connect(masterChain.tapeLowShelf);
  masterChain.compDryGain.connect(masterChain.tapeLowShelf);

  // Tape emulation (right after compressor): low shelf warmth → presence lift → saturation
  masterChain.tapeLowShelf.chain(
    masterChain.tapePresence,
    masterChain.tapeDriveGain,
    masterChain.tapeSaturation,
  );

  // Inflator (after tape): multiband upward compression
  masterChain.tapeSaturation.connect(masterChain.inflatorInputGain);

  // Wet path: split into bands, shape each, sum back
  masterChain.inflatorInputGain.connect(masterChain.inflatorLowPass);
  masterChain.inflatorInputGain.connect(masterChain.inflatorHighPass);
  masterChain.inflatorLowPass.connect(masterChain.inflatorLowShaper);
  masterChain.inflatorHighPass.connect(masterChain.inflatorHighShaper);
  // Both bands sum into wet gain
  masterChain.inflatorLowShaper.connect(masterChain.inflatorWetGain);
  masterChain.inflatorHighShaper.connect(masterChain.inflatorWetGain);

  // Dry path: bypass the shapers
  masterChain.inflatorInputGain.connect(masterChain.inflatorDryGain);

  // Wet and dry sum into output gain
  masterChain.inflatorWetGain.connect(masterChain.inflatorOutputGain);
  masterChain.inflatorDryGain.connect(masterChain.inflatorOutputGain);

  // Tube saturation (after inflator) - subtle even harmonics
  masterChain.inflatorOutputGain.connect(masterChain.tubeDriveGain);
  masterChain.tubeDriveGain.connect(masterChain.tubeSaturation);

  // Filters (after tube saturation)
  masterChain.tubeSaturation.chain(
    masterChain.lowPassFilter,
    masterChain.highPassFilter,
  );

  // Parallel phaser send: filtered to keep sub bass clean
  masterChain.highPassFilter.connect(masterChain.phaserPreFilter);
  masterChain.phaserPreFilter.chain(
    masterChain.phaser,
    masterChain.phaserSendGain,
  );
  masterChain.phaserSendGain.connect(masterChain.limiter);

  // Parallel reverb send: filtered to keep low end dry
  masterChain.highPassFilter.connect(masterChain.reverbPreFilter);
  masterChain.reverbPreFilter.chain(
    masterChain.reverb,
    masterChain.reverbSendGain,
  );
  masterChain.reverbSendGain.connect(masterChain.limiter);

  // Main signal to limiter
  masterChain.highPassFilter.connect(masterChain.limiter);

  // Output: limiter → master volume → destination and meter
  // This ensures the meter shows the actual output level after volume adjustment
  masterChain.limiter.connect(masterChain.masterVolumeGain);
  masterChain.masterVolumeGain.connect(destination);
  masterChain.masterVolumeGain.connect(masterChain.outputMeter);
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
    knee: MASTER_COMP_KNEE, // Hard knee for punchy transients
  });

  // Makeup gain compensates for gain reduction (fixed at +1.5dB)
  const compMakeupGain = new Gain(Math.pow(10, MASTER_COMP_MAKEUP_GAIN / 20));

  // Parallel compression wet/dry mix
  const compWetGain = new Gain(settings.compMix);
  // Delay compensates for compressor lookahead latency to keep wet/dry in phase
  const compDryDelay = new Delay(MASTER_COMP_LATENCY);
  const compDryGain = new Gain(1 - settings.compMix);

  // Tape emulation section (Studer A800 style)
  // Low shelf adds NAB-curve bass warmth
  const tapeLowShelf = new BiquadFilter({
    frequency: TAPE_LOW_SHELF_FREQ,
    type: "lowshelf",
    gain: TAPE_LOW_SHELF_GAIN,
  });

  // Pre-saturation presence adds "HF driver" character
  const tapePresence = new BiquadFilter({
    frequency: TAPE_PRESENCE_FREQ,
    type: "peaking",
    Q: TAPE_PRESENCE_Q,
    gain: TAPE_PRESENCE_GAIN,
  });

  const tapeDriveGain = new Gain(settings.tapeDriveGain);

  // WaveShaper with tape-like saturation curve (asymmetric for even harmonics)
  const tapeSaturation = new WaveShaper((x: number) => {
    // Asymmetric soft saturation - adds even harmonics like real tape
    const asymmetricInput = x + TAPE_SATURATION_ASYMMETRY * x * x;
    return (
      Math.tanh(TAPE_SATURATION_DRIVE * asymmetricInput) *
      TAPE_SATURATION_OUTPUT
    );
  }, 4096);

  // Inflator section (Oxford Inflator style - multiband upward compression)
  const inflatorInputGain = new Gain(Math.pow(10, INFLATOR_INPUT_GAIN / 20));

  // Crossover filters for band split
  const inflatorLowPass = new Filter(INFLATOR_CROSSOVER_FREQ, "lowpass");
  const inflatorHighPass = new Filter(INFLATOR_CROSSOVER_FREQ, "highpass");

  // Inflator waveshaping curve - gentle upward compression
  const inflatorCurve = (x: number) => {
    // Polynomial curve that increases quieter parts more than louder parts
    // Similar to soft-knee upward compression - transparent loudness boost
    const curve = INFLATOR_CURVE / 10; // Normalize to gentler range
    const squared = x * x;
    // Adds body to signal without harsh clipping
    return x * (1 + curve * (1 - Math.abs(x))) * (1 - squared * 0.1);
  };

  const inflatorLowShaper = new WaveShaper(inflatorCurve, 4096);
  const inflatorHighShaper = new WaveShaper(inflatorCurve, 4096);

  // Wet/dry mix
  const inflatorWetGain = new Gain(settings.inflatorEffect);
  const inflatorDryGain = new Gain(1 - settings.inflatorEffect);

  // Output compensation
  const inflatorOutputGain = new Gain(Math.pow(10, INFLATOR_OUTPUT_GAIN / 20));

  // Tube saturation (Saturn 2 Clean Tube style) - subtle even harmonics
  const tubeDriveGain = new Gain(settings.saturationDriveGain);
  const tubeSaturation = new WaveShaper((x: number) => {
    // Gentle tube saturation with even harmonics from asymmetry
    // 100% wet, so no dry signal mixing needed
    return Math.tanh(x * (1 + TUBE_DRIVE) + TUBE_ASYMMETRY * x * Math.abs(x));
  }, 4096);

  // Master volume gain node - applies volume before metering so meter shows actual output
  const masterVolumeGain = new Gain(dbToGain(settings.masterVolume));

  const limiter = new Limiter(MASTER_LIMITER_THRESHOLD);
  const outputMeter = new Meter({
    smoothing: 0.8,
    normalRange: false,
  });

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
    tapeLowShelf,
    tapePresence,
    tapeDriveGain,
    tapeSaturation,
    inflatorInputGain,
    inflatorLowPass,
    inflatorHighPass,
    inflatorLowShaper,
    inflatorHighShaper,
    inflatorWetGain,
    inflatorDryGain,
    inflatorOutputGain,
    tubeDriveGain,
    tubeSaturation,
    masterVolumeGain,
    limiter,
    outputMeter,
  };
}

/**
 * Maps knob params → concrete numeric settings.
 */
export function mapParamsToSettings(
  params: MasterChainParams,
): MasterChainSettings {
  const tapeDriveDb = transformKnobValue(
    params.tapeDrive ?? MASTER_TAPE_DRIVE_DEFAULT,
    MASTER_TAPE_DRIVE_RANGE_DB,
  );
  const saturationDriveDb = transformKnobValue(
    params.saturationDrive ?? MASTER_SATURATION_DRIVE_DEFAULT,
    MASTER_SATURATION_DRIVE_RANGE_DB,
  );
  const inflatorPercent = transformKnobValue(
    params.inflatorAmount ?? MASTER_INFLATOR_AMOUNT_DEFAULT,
    MASTER_INFLATOR_AMOUNT_RANGE,
  );

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
    compMix:
      transformKnobValue(
        params.compMix ?? MASTER_COMP_DEFAULT_MIX,
        MASTER_COMP_MIX_RANGE,
      ) / 100,
    tapeDriveGain: dbToGain(tapeDriveDb),
    inflatorEffect: inflatorPercent / 100,
    saturationDriveGain: dbToGain(saturationDriveDb),
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
  // Character processors
  runtimes.tapeDriveGain.gain.value = settings.tapeDriveGain;
  runtimes.inflatorWetGain.gain.value = settings.inflatorEffect;
  runtimes.inflatorDryGain.gain.value = 1 - settings.inflatorEffect;
  runtimes.tubeDriveGain.gain.value = settings.saturationDriveGain;

  // Filter settings
  runtimes.lowPassFilter.frequency.value = settings.lowPassFrequency;
  runtimes.highPassFilter.frequency.value = settings.highPassFrequency;

  // Effect send settings
  runtimes.phaserSendGain.gain.value = settings.phaserWet;
  runtimes.reverbSendGain.gain.value = settings.reverbWet;
  runtimes.reverb.decay = settings.reverbDecay;

  // Master volume applied via gain node so meter shows actual output level
  runtimes.masterVolumeGain.gain.value = dbToGain(settings.masterVolume);
}
