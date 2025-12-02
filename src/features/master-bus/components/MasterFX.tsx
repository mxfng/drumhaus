import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  highPassFilterMapping,
  lowPassFilterMapping,
  phaserWetMapping,
  reverbWetMapping,
} from "@/shared/knob/lib/mapping";

/*
TODO: Add remaining features

- Compress filter knobs into single split filter knob
- Add saturation to master chain and set up saturation knob where 2nd filter knob is

 */
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
    <>
      <ParamKnob
        label="filter" // TODO
        mapping={lowPassFilterMapping}
        value={lowPass}
        onValueChange={setLowPass}
      />
      <ParamKnob
        label="saturation" // TODO
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
    </>
  );
};
