export interface MasterChainParams {
  lowPass: number;
  highPass: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  compMix: number; // Parallel compression wet/dry (0-100 knob value)
  masterVolume: number;
}
