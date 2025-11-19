import type { KitFileV1 } from "@/types/instrument";
import type { Pattern } from "@/types/pattern";
import { Meta } from "./meta";

export type VariationCycle = "A" | "B" | "AB" | "AAAB";

export interface MasterChainData {
  lowPass: number;
  hiPass: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  masterVolume: number;
}

export interface TransportData {
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
  transport: TransportData;
  sequencer: SequencerData;
  masterChain: MasterChainData;
}
