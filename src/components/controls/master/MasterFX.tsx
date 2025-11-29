import ParamKnob from "@/components/common/Knob";
import {
  highPassFilterMapping,
  lowPassFilterMapping,
  phaserWetMapping,
  reverbWetMapping,
} from "@/lib/knob/mapping";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

export const MasterFX: React.FC = () => {
  const lowPass = useMasterChainStore((state) => state.lowPass);
  const highPass = useMasterChainStore((state) => state.highPass);
  const phaser = useMasterChainStore((state) => state.phaser);
  const reverb = useMasterChainStore((state) => state.reverb);

  const setLowPass = useMasterChainStore((state) => state.setLowPass);
  const setHighPass = useMasterChainStore((state) => state.setHighPass);
  const setPhaser = useMasterChainStore((state) => state.setPhaser);
  const setReverb = useMasterChainStore((state) => state.setReverb);

  return (
    <div className="grid aspect-square w-full grid-cols-2 place-items-center">
      <ParamKnob
        label="LPF"
        mapping={lowPassFilterMapping}
        value={lowPass}
        onValueChange={setLowPass}
      />
      <ParamKnob
        label="REVERB"
        mapping={reverbWetMapping}
        value={reverb}
        onValueChange={setReverb}
        outerTickCount={5}
      />
      <ParamKnob
        label="HPF"
        mapping={highPassFilterMapping}
        value={highPass}
        onValueChange={setHighPass}
      />
      <ParamKnob
        label="PHASER"
        mapping={phaserWetMapping}
        value={phaser}
        onValueChange={setPhaser}
        outerTickCount={5}
      />
    </div>
  );
};
