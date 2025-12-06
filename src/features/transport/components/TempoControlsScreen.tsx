import { VARIATION_CHAIN_COLORS } from "@/features/sequencer/lib/colors";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { ScreenBar } from "@/layout/ScreenBar";
import { ClickableValue } from "@/shared/components/ClickableValue";
import {
  transportBpmMapping,
  transportSwingMapping,
} from "@/shared/knob/lib/mapping";
import { cn } from "@/shared/lib/utils";

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

  const playbackVariationColors = VARIATION_CHAIN_COLORS[playbackVariation];

  return (
    <ScreenBar>
      <div className="grid w-full grid-cols-5 place-items-stretch gap-0">
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

        <span className="flex w-full items-center justify-start">
          <span className="pr-2 pl-1 text-xs">play</span>
          <div className="bg-accent-foreground h-4 w-4 rounded-tr rounded-bl">
            <span
              className={cn(
                "font-pixel flex items-center justify-center px-1 text-xs",
                playbackVariationColors.bg,
                playbackVariationColors.border,
                playbackVariationColors.text,
              )}
            >
              {VARIATION_LABELS[playbackVariation]}
            </span>
          </div>
        </span>
        <span className="col-span-2 flex w-full items-center justify-start">
          <span className="text-xs">chain</span>
          <span
            className={cn("flex-1 pl-1", {
              "flex w-full items-center justify-center": !chainEnabled,
            })}
          >
            {chainEnabled ? chainString : "—"}
          </span>
        </span>
      </div>
    </ScreenBar>
  );
};
