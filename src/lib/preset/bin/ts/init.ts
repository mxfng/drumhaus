import * as kits from "@/lib/kit";
import { createEmptyPattern } from "@/lib/pattern/create";
import type { PresetFileV1 } from "@/types/preset";

export const init = (): PresetFileV1 => ({
  kind: "drumhaus.preset",
  version: 1,
  meta: {
    id: "preset-init",
    name: "init",
    createdAt: "2023-11-20T16:00:00.000Z",
    updatedAt: "2023-11-20T16:00:00.000Z",
  },
  kit: kits.drumhaus(),
  transport: {
    bpm: 100,
    swing: 0,
  },
  sequencer: {
    pattern: createEmptyPattern(),
    variationCycle: "A",
  },
  masterChain: {
    lowPass: 100,
    hiPass: 0,
    phaser: 0,
    reverb: 0,
    compThreshold: 100,
    compRatio: 43,
    masterVolume: 92,
  },
});
