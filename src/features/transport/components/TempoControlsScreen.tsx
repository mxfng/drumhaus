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
      <div className="grid w-full grid-cols-4">
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
        <span className="col-span-2">
          <span className="text-xs">chain</span>
          <b className="pl-1">{chainEnabled ? chainString : "—"}</b>
        </span>
      </div>
    </ScreenBar>
  );
};
