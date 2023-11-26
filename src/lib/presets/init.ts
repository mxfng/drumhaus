import { Preset } from "@/types/types";
import * as kits from "@/lib/kits";

export const init = (): Preset => ({
  name: "init",
  _kit: kits.drumhaus(),
  _bpm: 100,
  _swing: 0,
  _lowPass: 100,
  _hiPass: 0,
  _phaser: 0,
  _reverb: 0,
  _compThreshold: 100,
  _compRatio: 43,
  _masterVolume: 92,
  _sequences: Array.from({ length: 8 }, () =>
    Array.from({ length: 2 }, () => [
      Array.from({ length: 16 }, () => false),
      Array.from({ length: 16 }, () => 1),
    ])
  ),
  _variation: 0,
  _chain: 0,
});
