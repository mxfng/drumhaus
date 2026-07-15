import { TRANSPORT_SWING_RANGE } from "@/core/audio/engine/constants";
import { VariationBadge } from "@/features/sequencer/components/variation-badge";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { ScreenBar } from "@/layout/screen-bar";
import { ClickableValue } from "@/shared/components/clickable-value";
import {
  transportBpmMapping,
  transportSwingMapping,
} from "@/shared/knob/lib/mapping";
import { clamp, cn } from "@/shared/lib/utils";

function TempoControlsScreen() {
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

  // The store's swing IS the 0-100 knob value (the mapping's domain is the
  // MPC display percent), so the knob value passes through directly.
  // Integer rounding matches tempo-controls.tsx so both swing entry points
  // persist the same granularity.
  const handleSwingChange = (knobValue: number) => {
    setSwing(
      clamp(
        Math.round(knobValue),
        TRANSPORT_SWING_RANGE[0],
        TRANSPORT_SWING_RANGE[1],
      ),
    );
  };

  // Convert chain to string format (e.g., "AABBABCD")
  const chainString = chain.steps
    .map((step) => VARIATION_LABELS[step.variation].repeat(step.repeats))
    .join("");

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
          className="whitespace-nowrap tabular-nums"
        />
        <ClickableValue
          value={swing}
          onValueChange={handleSwingChange}
          mapping={transportSwingMapping}
          sensitivity={0.2}
          label="swing"
          labelClassName="text-xs"
          className="whitespace-nowrap tabular-nums"
        />

        <span className="flex w-full items-center justify-start">
          <span className="pr-2 pl-1 text-xs">play</span>
          <VariationBadge variation={playbackVariation} />
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
}

export { TempoControlsScreen };
