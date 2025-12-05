import React from "react";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { ScreenBar } from "@/layout/ScreenBar";
import { cn } from "@/shared/lib/utils";

export const FlamEditScreen: React.FC = () => {
  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);

  const voiceIndex = mode.type === "flam" ? mode.voiceIndex : 0;
  const flams = usePatternStore(
    (state) => state.pattern.voices[voiceIndex].variations[variation].flams,
  );
  const instrumentName = useInstrumentsStore(
    (state) => state.instruments[voiceIndex].meta.name,
  );

  if (mode.type !== "flam") {
    return null;
  }

  const flamCount = flams.filter(Boolean).length;
  const variationLabel = VARIATION_LABELS[variation];

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center gap-1 px-5">
        {/* Show 16 step indicators */}
        {flamCount > 0 &&
          flams.map((hasFlam, idx) => (
            <div
              key={idx}
              className={cn(
                "flex h-3 flex-1 items-center justify-center rounded-tr-sm rounded-bl-sm border text-[8px]",
                hasFlam
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-foreground-muted/30 bg-foreground-muted/5 text-foreground-muted",
              )}
            >
              {hasFlam && (idx + 1).toString().padStart(2, "0")}
            </div>
          ))}

        {flamCount === 0 && (
          <span className="-my-1 text-[10px] leading-3 normal-case">
            No flams set for {instrumentName} ({variationLabel}).
            <br />
            Click steps in the sequencer to add flams.
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p className="truncate">
          flam mode - {instrumentName} ({variationLabel})
        </p>
        <p className="text-xs">{flamCount} / 16</p>
      </ScreenBar>
    </div>
  );
};
