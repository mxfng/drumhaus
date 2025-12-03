import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { ClickableValue } from "@/shared/components/ClickableValue";
import { ScreenBar } from "@/shared/components/ScreenBar";
import {
  transportBpmMapping,
  transportSwingMapping,
} from "@/shared/knob/lib/mapping";

export const TempoControlsScreen: React.FC = () => {
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);
  const chain = usePatternStore((state) => state.chain);
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);

  const bpmKnobValue = transportBpmMapping.domainToKnob(bpm);
  const handleBpmChange = (knobValue: number) => {
    const domainValue = transportBpmMapping.knobToDomain(knobValue);
    setBpm(Math.round(domainValue));
  };

  const swingKnobValue = transportSwingMapping.domainToKnob(swing);
  const handleSwingChange = (knobValue: number) => {
    const domainValue = transportSwingMapping.knobToDomain(knobValue);
    setSwing(domainValue);
  };

  // Convert chain to string format (e.g., "AABBABCD")
  const chainString = chain.steps
    .map((step) => VARIATION_LABELS[step.variation].repeat(step.repeats))
    .join("");

  return (
    <ScreenBar>
      <div className="grid w-full grid-cols-5 gap-4">
        <ClickableValue
          value={bpmKnobValue}
          onValueChange={handleBpmChange}
          mapping={transportBpmMapping}
          sensitivity={0.3}
          label="bpm"
          labelClassName="text-xs"
        />
        <ClickableValue
          value={swingKnobValue}
          onValueChange={handleSwingChange}
          mapping={transportSwingMapping}
          sensitivity={0.2}
          label="swing"
          labelClassName="text-xs"
        />
        <span className="flex items-center justify-start">
          <span className="pr-2 text-xs">play</span>
          <span className="bg-screen text-screen-foreground rounded-tr rounded-bl px-1 text-xs">
            {VARIATION_LABELS[playbackVariation]}
          </span>
        </span>
        <span className="col-span-2">
          <span className="text-xs">chain</span>
          <span className="pl-1">{chainEnabled ? chainString : "—"}</span>
        </span>
      </div>
    </ScreenBar>
  );
};
