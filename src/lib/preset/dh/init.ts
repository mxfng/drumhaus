import * as kits from "@/lib/drumhausKits";
import { createEmptyPattern } from "@/lib/pattern/create";
import type { Preset } from "@/types/preset";

export const init = (): Preset => ({
  name: "init",
  kit: kits.drumhaus(),
  bpm: 100,
  swing: 0,
  pattern: createEmptyPattern(),
  masterChain: {
    lowPass: 100,
    hiPass: 0,
    phaser: 0,
    reverb: 0,
    compThreshold: 100,
    compRatio: 43,
    masterVolume: 92,
  },
  variationCycle: "A",
});
