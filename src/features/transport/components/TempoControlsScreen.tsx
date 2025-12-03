import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { ClickableValue } from "@/shared/components/ClickableValue";
import {
  transportBpmMapping,
  transportSwingMapping,
} from "@/shared/knob/lib/mapping";

export const TempoControlsScreen: React.FC = () => {
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);

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

  return (
    <div className="bg-screen-foreground text-instrument flex h-full items-center rounded-tl-full px-2 pt-0.5 pl-4 text-sm">
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
          <b className="pl-1">ABABCDCD</b>
        </span>
      </div>
    </div>
  );
};
