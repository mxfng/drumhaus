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
