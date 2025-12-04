import React from "react";

import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { ScreenBar } from "@/shared/components/ScreenBar";
import { cn } from "@/shared/lib/utils";

export const AccentEditScreen: React.FC = () => {
  const variation = usePatternStore((state) => state.variation);
  const accents = usePatternStore(
    (state) => state.pattern.variationMetadata[variation].accent,
  );

  const accentCount = accents.filter(Boolean).length;
  const variationLabel = VARIATION_LABELS[variation];

  return (
    <div className="bg-instrument flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center gap-1 px-5">
        {/* Show 16 step indicators */}
        {accentCount > 0 &&
          accents.map((isAccented, idx) => (
            <div
              key={idx}
              className={cn(
                "flex h-3 flex-1 items-center justify-center rounded-tr-sm rounded-bl-sm border text-[8px]",
                isAccented
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-foreground-muted/30 bg-foreground-muted/5 text-foreground-muted",
              )}
            >
              {isAccented && (idx + 1).toString().padStart(2, "0")}
            </div>
          ))}

        {accentCount === 0 && (
          <span className="-my-1 text-[10px] leading-3 normal-case">
            No accents set for variation {variationLabel}.
            <br />
            Click steps in the sequencer to add accents.
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p>accent mode - variation {variationLabel}</p>
        <p className="text-xs">{accentCount} / 16</p>
      </ScreenBar>
    </div>
  );
};
