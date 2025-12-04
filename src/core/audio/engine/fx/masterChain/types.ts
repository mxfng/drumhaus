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

/**
 * Master chain runtime nodes.
 * Represents the complete audio graph for master bus processing.
 */
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
  saturation: Distortion; // User-controllable crunchier saturation for drums
  presenceDip: BiquadFilter; // Tames harsh 3-5kHz range
  highShelf: BiquadFilter; // Rolls off harsh highs
  limiter: Limiter;
}

/**
 * Master chain settings after parameter mapping.
 * Domain values ready to apply to audio nodes.
 */
export type MasterChainSettings = {
  // Split filter settings (single filter that switches type, same as instrument filter)
  filter: number; // Raw knob value 0-100
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

export interface MasterChainParams {
  // New unified filter (replaces lowPass/highPass)
  filter: number;
  saturation: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compMix: number; // Parallel compression wet/dry (0-100 knob value)
  masterVolume: number;

  // Legacy fields (for backward compatibility during migration)
  lowPass?: number;
  highPass?: number;
}
