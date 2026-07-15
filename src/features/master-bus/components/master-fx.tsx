import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import {
  masterPhaserDescriptor,
  masterReverbDescriptor,
  masterSaturationDescriptor,
  RotaryKnob,
  splitFilterDescriptor,
} from "@/shared/param-control";

function MasterFX() {
  const filter = useMasterChainStore((state) => state.filter);
  const saturation = useMasterChainStore((state) => state.saturation);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);

  const setFilter = useMasterChainStore((state) => state.setFilter);
  const setSaturation = useMasterChainStore((state) => state.setSaturation);
  const setPhaser = useMasterChainStore((state) => state.setPhaser);
  const setReverb = useMasterChainStore((state) => state.setReverb);

  return (
    <>
      <RotaryKnob
        label="filter"
        descriptor={splitFilterDescriptor}
        value={filter}
        onChange={setFilter}
      />
      <RotaryKnob
        label="saturation"
        descriptor={masterSaturationDescriptor}
        value={saturation}
        onChange={setSaturation}
      />
      <RotaryKnob
        label="reverb"
        descriptor={masterReverbDescriptor}
        value={reverb}
        onChange={setReverb}
      />
      <RotaryKnob
        label="phaser"
        descriptor={masterPhaserDescriptor}
        value={phaser}
        onChange={setPhaser}
      />
    </>
  );
}

export { MasterFX };
