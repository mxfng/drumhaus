import type { KitFileV1 } from "@/types/instrument";
import type { Pattern } from "@/types/pattern";
import { Meta } from "./meta";

export type VariationCycle = "A" | "B" | "AB" | "AAAB";

export interface MasterChainParams {
  lowPass: number;
  highPass: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  compMix: number; // Parallel compression wet/dry (0-100 knob value)
  tapeDrive: number;
  inflatorAmount: number;
  saturationDrive: number;
  masterVolume: number;
}

export interface TransportParams {
  bpm: number;
  swing: number;
}

export interface SequencerData {
  pattern: Pattern;
  variationCycle: VariationCycle;
}

// Presets hold all serializable data for a project
// They are always deconstructed at runtime into their respective stores
export interface PresetFileV1 {
  kind: "drumhaus.preset";
  version: 1;
  meta: Meta;
  kit: KitFileV1;
  transport: TransportParams;
  sequencer: SequencerData;
  masterChain: MasterChainParams;
}
