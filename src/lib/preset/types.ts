import type { Pattern } from "@/lib/pattern/types";
import type { Kit, VariationCycle } from "@/types/types";

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
