import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  compMixMapping,
  compRatioMapping,
  compThresholdMapping,
} from "@/shared/knob/lib/mapping";

/*
TODO: Add remaining features

There is an awkward 1st space since the compressor is only 3 knobs in a 4 row grid.

We could think about what we want to do with the 1st space.

For a drum-focused compressor in Drumhaus, the best fourth knob is Attack (or a swagger-ier label like Punch).
Threshold and Ratio set how much compression happens, and Mix blends it back in — but Attack is the control
that actually shapes the feel of drum hits. It decides whether the transient cracks through or gets rounded off,
which makes an immediate, musical difference across kicks, snares, and hats. Release, Knee, and Output add complexity
without adding as much “instant character.” Attack gives you a simple, high-impact control that fits the hardware-inspired
Drumhaus philosophy and fills that fourth slot with something both useful and fun to play with.
*/
export const MasterCompressor: React.FC = () => {
  const threshold = useMasterChainStore((state) => state.compThreshold);
  const ratio = useMasterChainStore((state) => state.compRatio);
  const mix = useMasterChainStore((state) => state.compMix);

  const setThreshold = useMasterChainStore((state) => state.setCompThreshold);
  const setRatio = useMasterChainStore((state) => state.setCompRatio);
  const setMix = useMasterChainStore((state) => state.setCompMix);

  return (
    <>
      {/* dummy for now */}
      <ParamKnob
        value={threshold}
        onValueChange={setThreshold}
        label="punch" // TODO: will be attack
        mapping={compThresholdMapping}
      />
      {/* Threshold and Ratio */}
      <ParamKnob
        value={threshold}
        onValueChange={setThreshold}
        label="threshold"
        mapping={compThresholdMapping}
      />
      <ParamKnob
        value={ratio}
        onValueChange={setRatio}
        label="ratio"
        mapping={compRatioMapping}
        outerTickCount={8}
      />

      <ParamKnob
        value={mix}
        onValueChange={setMix}
        label="mix"
        mapping={compMixMapping}
      />
    </>
  );
};
