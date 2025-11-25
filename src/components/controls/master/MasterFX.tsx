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
    <div className="relative flex items-center">
      <span className="text-foreground-muted absolute -left-8 w-[70px] -rotate-90 text-xs">
        MASTER FX
      </span>
      <div className="grid grid-cols-2 gap-y-2 pl-4">
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
    </div>
  );
};
