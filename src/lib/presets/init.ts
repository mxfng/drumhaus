import * as kits from "@/lib/kits";
import { createEmptyPattern } from "@/lib/pattern/migrate";
import { Preset } from "@/types/types";

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
  _pattern: createEmptyPattern(),
  _variation: 0,
  _chain: 0,
});
