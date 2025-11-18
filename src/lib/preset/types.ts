import type { Kit } from "@/lib/instrument/types";
import type { Pattern } from "@/lib/pattern/types";

export type VariationCycle = "A" | "B" | "AB" | "AAAB";

export interface Preset {
  name: string;
  kit: Kit;
  pattern: Pattern;
  bpm: number;
  swing: number;
  variationCycle: VariationCycle;
  masterChain: {
    lowPass: number;
    hiPass: number;
    phaser: number;
    reverb: number;
    compThreshold: number;
    compRatio: number;
    masterVolume: number;
  };
}
