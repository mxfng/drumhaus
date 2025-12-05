import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  phaserWetMapping,
  reverbWetMapping,
  saturationWetMapping,
  splitFilterMapping,
} from "@/shared/knob/lib/mapping";

export const MasterFX: React.FC = () => {
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
      <ParamKnob
        label="filter" // TODO: fix routing to use 2 nodes so we dont reload nodes mid playback
        mapping={splitFilterMapping}
        value={filter}
        onValueChange={setFilter}
        outerTickCount={3}
      />
      <ParamKnob
        label="saturation"
        mapping={saturationWetMapping}
        value={saturation}
        onValueChange={setSaturation}
      />
      <ParamKnob
        label="reverb"
        mapping={reverbWetMapping}
        value={reverb}
        onValueChange={setReverb}
        outerTickCount={5}
      />

      <ParamKnob
        label="phaser"
        mapping={phaserWetMapping}
        value={phaser}
        onValueChange={setPhaser}
        outerTickCount={5}
      />
    </>
  );
};
