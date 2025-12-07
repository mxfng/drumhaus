import React from "react";
import { Plus } from "lucide-react";

import { MAX_CHAIN_STEPS } from "@/features/sequencer/lib/chain";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { ScreenBar } from "@/layout/ScreenBar";
import { VariationBadge } from "./VariationBadge";

export const ChainEditScreen: React.FC = () => {
  const chain = usePatternStore((state) => state.chainDraft);
  const totalBars = chain.steps.reduce((sum, step) => sum + step.repeats, 0);

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 flex-wrap items-center gap-1 px-5 lowercase">
        {chain.steps.map((step, idx) => {
          const isLast = idx === chain.steps.length - 1;
          return (
            <React.Fragment key={`${step.variation}-${idx}`}>
              <VariationBadge
                variation={step.variation}
                size="md"
                repeats={step.repeats}
              />

              {!isLast && (
                <div className="border-foreground-muted h-px w-3 border-t border-dashed" />
              )}
            </React.Fragment>
          );
        })}

        {totalBars < MAX_CHAIN_STEPS && (
          <>
            {chain.steps.length > 0 && (
              <div className="border-foreground-muted h-px w-3 border-t border-dashed" />
            )}
            <div className="border-foreground-muted text-foreground flex items-center justify-center rounded-tr rounded-bl border border-dashed text-xs">
              <Plus size={16} />
            </div>
          </>
        )}

        {totalBars === 0 && (
          <span className="-my-2 flex-1 pl-2 text-[10px] leading-3 wrap-normal normal-case">
            Press A, B, C, or D buttons below and create your chain
            <br />
            When finished, click <b>vari chain</b> to save your sequence
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p>variation chain mode</p>
        <p className="text-center text-xs">
          bars {totalBars} / {MAX_CHAIN_STEPS}
        </p>
      </ScreenBar>
    </div>
  );
};
