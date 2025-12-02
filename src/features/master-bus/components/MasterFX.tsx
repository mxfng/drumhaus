import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  highPassFilterMapping,
  lowPassFilterMapping,
  phaserWetMapping,
  reverbWetMapping,
} from "@/shared/knob/lib/mapping";

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
    <div className="grid aspect-square w-full grid-cols-2 place-items-center gap-2">
      <ParamKnob
        label="lowpass"
        mapping={lowPassFilterMapping}
        value={lowPass}
        onValueChange={setLowPass}
      />
      <ParamKnob
        label="hipass"
        mapping={highPassFilterMapping}
        value={highPass}
        onValueChange={setHighPass}
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
    </div>
  );
};
