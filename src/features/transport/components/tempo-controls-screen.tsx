import { TRANSPORT_SWING_RANGE } from "@/core/audio/engine/constants";
import { MAX_CHAIN_STEPS } from "@/core/audio/engine/pattern-types";
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
      {/* Content-sized cells with the leftover space spread evenly between
          them. Each numeric value reserves its widest rendering (min-w in
          ch, tabular digits) so neighbors don't shift while dragging. */}
      <div className="flex w-full items-center justify-between gap-1 whitespace-nowrap tabular-nums">
        <ClickableValue
          value={bpmKnobValue}
          onValueChange={handleBpmChange}
          mapping={transportBpmMapping}
          sensitivity={0.3}
          label="bpm"
          labelClassName="text-xs"
          valueClassName="inline-block min-w-[3.5ch]"
        />
        <ClickableValue
          value={swing}
          onValueChange={handleSwingChange}
          mapping={transportSwingMapping}
          sensitivity={0.2}
          label="swing"
          labelClassName="text-xs"
          valueClassName="inline-block min-w-[4ch]"
        />

        <span className="flex items-center">
          <span className="pr-2 text-xs">play</span>
          <VariationBadge variation={playbackVariation} />
        </span>
        <span className="flex items-center">
          <span className="text-xs">chain</span>
          {/* Reserve the worst-case chain width: one invisible sizer per
              variation letter, each repeated to the maximum chain length,
              stacked in the same grid cell so the widest letter wins. */}
          <span className="ml-1 grid">
            {VARIATION_LABELS.map((letter) => (
              <span
                key={letter}
                aria-hidden="true"
                className="invisible col-start-1 row-start-1"
              >
                {letter.repeat(MAX_CHAIN_STEPS)}
              </span>
            ))}
            <span
              className={cn("col-start-1 row-start-1", {
                "text-center": !chainEnabled,
              })}
            >
              {chainEnabled ? chainString : "—"}
            </span>
          </span>
        </span>
      </div>
    </ScreenBar>
  );
}

export { TempoControlsScreen };
