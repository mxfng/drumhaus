/**
 * Master bus audio processing.
 *
 * Cohesive class owning the master bus graph: parallel compression, split
 * filter, phaser/reverb sends, saturation, EQ, and output limiting.
 * All methods take MasterChainSettings (domain values); knob-value mapping
 * happens at the boundary in bridge/knob-to-domain.ts.
 */

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
  type DestinationInstance,
  type ToneAudioNode,
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
} from "./constants";
import { applySplitFilterWithRamp } from "./fx/split-filter";

/**
 * Master chain settings in domain values, ready to apply to audio nodes.
 * The knob-level MasterChainParams shape lives in bridge/knob-to-domain.ts.
 */
type MasterChainSettings = {
  // Split filter settings (single filter that switches type, same as instrument filter)
  filter: number; // Split-filter position 0-100; semantics in engine/fx/split-filter.ts
  saturationWet: number;
  saturationAmount: number;
  phaserWet: number;
  reverbWet: number;
  reverbDecay: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compMix: number; // 0-1 wet/dry mix for parallel compression
  masterVolume: number;
};

/**
 * Master bus runtime nodes (internal implementation detail).
 * Represents the complete audio graph for master bus processing.
 */
interface MasterBusNodes {
  // Compressor section (front of chain with parallel compression)
  compressor: Compressor;
  compMakeupGain: Gain<"decibels">; // Fixed makeup gain after compressor
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
  saturation: Distortion; // User-controllable crunchier saturation for drums
  presenceDip: BiquadFilter; // Tames harsh 3-5kHz range
  highShelf: BiquadFilter; // Rolls off harsh highs
  limiter: Limiter;
}

/**
 * Master bus: parallel compression, split filter, FX sends, and output
 * limiting. Shared between online and offline contexts.
 */
class MasterBus {
  private nodes: MasterBusNodes;
  /**
   * The destination this bus was built against, retained so applySettings
   * always targets the bus's OWN context (live buses set the live
   * destination volume, offline buses the offline render's). Both the
   * global destination and offline destinations expose a volume param in
   * Tone 15, so no bus-owned volume node is needed.
   */
  private readonly destination: DestinationInstance;
  /**
   * Copy of the settings applied by the last applySettings call, used to
   * diff incoming pushes so unchanged fields never touch their nodes.
   */
  private appliedSettings: MasterChainSettings | null = null;

  private constructor(nodes: MasterBusNodes, destination: DestinationInstance) {
    this.nodes = nodes;
    this.destination = destination;
  }

  /**
   * Builds the master bus from settings and chains it to a destination.
   * Shared between online and offline contexts.
   *
   * @param settings The master chain settings (domain values)
   * @param destination The destination node (getDestination() for online, offline destination for export)
   */
  static async create(
    settings: MasterChainSettings,
    destination: DestinationInstance,
  ): Promise<MasterBus> {
    const nodes = await buildMasterBusNodes(settings);
    const bus = new MasterBus(nodes, destination);
    bus.applySettings(settings);
    connectMasterBusNodes(nodes, destination);
    return bus;
  }

  /**
   * Connects an input source to the master bus.
   * Routes the source into the parallel compression section.
   *
   * Signal splits at input:
   * - Wet path: through compressor
   * - Dry path: through latency-compensated delay
   */
  connectInput(source: ToneAudioNode): void {
    source.connect(this.nodes.compressor); // Wet path
    source.connect(this.nodes.compDryDelay); // Dry path (latency comp)
  }

  /**
   * Applies master chain settings (domain values) to the bus nodes.
   *
   * Diffs against the previously applied settings and only touches fields
   * whose values changed: assigning reverb.decay re-renders the impulse
   * response and the split filter schedules param ramps, so re-applying
   * every field on every master push would be wasteful and audibly
   * disruptive.
   */
  applySettings(settings: MasterChainSettings): void {
    const nodes = this.nodes;
    const prev = this.appliedSettings;
    const changed = (field: keyof MasterChainSettings): boolean =>
      !prev || prev[field] !== settings[field];

    // Compressor settings
    if (changed("compThreshold")) {
      nodes.compressor.threshold.value = settings.compThreshold;
    }
    if (changed("compRatio")) {
      nodes.compressor.ratio.value = settings.compRatio;
    }
    if (changed("compAttack")) {
      nodes.compressor.attack.value = settings.compAttack;
    }
    // Parallel compression wet/dry mix
    if (changed("compMix")) {
      nodes.compWetGain.gain.value = settings.compMix;
      nodes.compDryGain.gain.value = 1 - settings.compMix;
    }

    // Split filter settings (same as instrument filter implementation)
    if (changed("filter")) {
      applySplitFilterWithRamp(
        nodes.lowPassFilter,
        nodes.highPassFilter,
        settings.filter,
        {
          minFrequency: MASTER_FILTER_RANGE[0],
          maxFrequency: MASTER_FILTER_RANGE[1],
        },
      );
    }

    // Saturation wet/dry mix
    if (changed("saturationAmount")) {
      nodes.saturation.distortion = settings.saturationAmount;
    }
    if (changed("saturationWet")) {
      nodes.saturation.wet.value = settings.saturationWet;
    }

    // Effect send settings
    if (changed("phaserWet")) {
      nodes.phaserSendGain.gain.value = settings.phaserWet;
    }
    if (changed("reverbWet")) {
      nodes.reverbSendGain.gain.value = settings.reverbWet;
    }
    // Guarded because assigning decay kicks off an async re-render of the
    // reverb impulse response.
    if (changed("reverbDecay")) {
      nodes.reverb.decay = settings.reverbDecay;
    }

    // Master volume is applied to the RETAINED destination, never the
    // global one: a live bus can no longer write into an in-flight offline
    // render (Tone swaps the global context during Offline callbacks), and
    // offline buses always target their own render's output.
    if (changed("masterVolume")) {
      this.destination.volume.value = settings.masterVolume;
    }

    // Copied so later mutation of the caller's object cannot corrupt the diff.
    this.appliedSettings = { ...settings };
  }

  /**
   * Disposes all master bus nodes.
   * Handles errors gracefully to prevent crashes during cleanup.
   */
  dispose(): void {
    const nodes = this.nodes;

    const nodesToDispose = [
      { name: "compressor", node: nodes.compressor },
      { name: "compMakeupGain", node: nodes.compMakeupGain },
      { name: "compWetGain", node: nodes.compWetGain },
      { name: "compDryDelay", node: nodes.compDryDelay },
      { name: "compDryGain", node: nodes.compDryGain },
      { name: "lowPassFilter", node: nodes.lowPassFilter },
      { name: "highPassFilter", node: nodes.highPassFilter },
      { name: "phaserPreFilter", node: nodes.phaserPreFilter },
      { name: "phaser", node: nodes.phaser },
      { name: "phaserSendGain", node: nodes.phaserSendGain },
      { name: "reverbPreFilter", node: nodes.reverbPreFilter },
      { name: "reverb", node: nodes.reverb },
      { name: "reverbSendGain", node: nodes.reverbSendGain },
      { name: "saturation", node: nodes.saturation },
      { name: "presenceDip", node: nodes.presenceDip },
      { name: "highShelf", node: nodes.highShelf },
      { name: "limiter", node: nodes.limiter },
    ];

    for (const { name, node } of nodesToDispose) {
      try {
        node.dispose();
      } catch (error) {
        console.warn(`Error disposing ${name}:`, error);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Node construction
// -----------------------------------------------------------------------------

/**
 * Builds the master bus audio nodes from settings.
 * Orchestrates all FX section creation.
 */
async function buildMasterBusNodes(
  settings: MasterChainSettings,
): Promise<MasterBusNodes> {
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
  const compMakeupGain = new Gain(MASTER_COMP_MAKEUP_GAIN, "decibels");

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

/**
 * Creates output processing chain: saturation -> EQ -> limiting.
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

// -----------------------------------------------------------------------------
// Routing
// -----------------------------------------------------------------------------

/**
 * Chains master bus nodes in the correct order.
 *
 * @param nodes The master bus nodes.
 * @param destination The destination node to chain to
 *        (e.g., getDestination() for online, or offline destination for export).
 */
function connectMasterBusNodes(
  nodes: MasterBusNodes,
  destination: DestinationInstance,
): void {
  // Compressor section (front of chain with parallel compression)
  // Wet path: compressor -> makeup gain -> wet gain
  nodes.compressor.chain(nodes.compMakeupGain, nodes.compWetGain);
  // Dry path: delay (latency compensation) -> dry gain
  nodes.compDryDelay.connect(nodes.compDryGain);
  // Both wet and dry paths sum into the low pass filter
  nodes.compWetGain.connect(nodes.lowPassFilter);
  nodes.compDryGain.connect(nodes.lowPassFilter);

  // Input filters (after compressor section)
  nodes.lowPassFilter.chain(nodes.highPassFilter);

  // Parallel phaser send: filtered to keep sub bass clean
  nodes.highPassFilter.connect(nodes.phaserPreFilter);
  nodes.phaserPreFilter.chain(nodes.phaser, nodes.phaserSendGain);
  nodes.phaserSendGain.connect(nodes.saturation);

  // Parallel reverb send: filtered to keep low end dry
  nodes.highPassFilter.connect(nodes.reverbPreFilter);
  nodes.reverbPreFilter.chain(nodes.reverb, nodes.reverbSendGain);
  nodes.reverbSendGain.connect(nodes.saturation);

  // Output chain: drum saturation (user-controllable) -> EQ -> limiter
  nodes.highPassFilter.connect(nodes.saturation);
  nodes.saturation.chain(
    nodes.presenceDip,
    nodes.highShelf,
    nodes.limiter,
    destination,
  );
}

export { MasterBus };
export type { MasterChainSettings };
