import React from "react";
import { Plus } from "lucide-react";

import { MAX_CHAIN_STEPS } from "@/features/sequencer/lib/chain";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { ScreenBar } from "@/shared/components/ScreenBar";
import { cn } from "@/shared/lib/utils";

export const ChainEditScreen: React.FC = () => {
  const chain = usePatternStore((state) => state.chainDraft);
  const totalBars = chain.steps.reduce((sum, step) => sum + step.repeats, 0);

  return (
    <div className="bg-instrument flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 flex-wrap items-center gap-1 px-5 lowercase">
        {chain.steps.map((step, idx) => {
          const isActive = idx === chain.steps.length;
          const label = VARIATION_LABELS[step.variation];
          const isLast = idx === chain.steps.length - 1;
          return (
            <React.Fragment key={`${step.variation}-${idx}`}>
              <div
                className={cn(
                  "flex items-center justify-center gap-1 rounded-tr rounded-bl border px-1 text-xs",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-foreground text-foreground",
                )}
              >
                <span className="font-semibold uppercase">{label}</span>
                {step.repeats > 1 && (
                  <span className="text-foreground-muted text-xs">
                    ×{step.repeats}
                  </span>
                )}
              </div>
              {!isLast && (
                <div className="border-foreground-muted h-px w-3 border-t border-dashed" />
              )}
            </React.Fragment>
          );
        })}

        {totalBars < MAX_CHAIN_STEPS && (
          <>
            {chain.steps.length > 0 && (
              <div className="border-foreground-muted h-px w-4 border-t border-dashed" />
            )}
            <div className="border-foreground-muted text-foreground flex items-center justify-center rounded-tr rounded-bl border border-dashed text-xs">
              <Plus size={16} />
            </div>
          </>
        )}

        {totalBars === 0 && (
          <span className="-my-2 flex-1 pl-2 text-[10px] leading-3 wrap-normal normal-case">
            Press A, B, C, or D buttons below and create your chain.
            <br />
            When finished, click <b>vari chain</b> to save your sequence.
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p>new variation chain</p>
        <p className="text-center text-xs">
          bars {totalBars} / {MAX_CHAIN_STEPS}
        </p>
      </ScreenBar>
    </div>
  );
};
