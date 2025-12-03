import React from "react";

import {
  MAX_CHAIN_REPEAT,
  MAX_CHAIN_STEPS,
  MIN_CHAIN_REPEAT,
} from "@/features/sequencer/lib/chain";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";

export const ChainEditPrompt: React.FC = () => {
  const chain = usePatternStore((state) => state.chain);
  const mode = usePatternStore((state) => state.mode);
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const setChainEditStep = usePatternStore((state) => state.setChainEditStep);
  const updateChainStepRepeat = usePatternStore(
    (state) => state.updateChainStepRepeat,
  );

  const activeIndex = mode.type === "variationChain" ? mode.stepIndex : 0;
  const activeStep = chain.steps[activeIndex];
  const repeats = activeStep?.repeats ?? MIN_CHAIN_REPEAT;

  const handleRepeatAdjust = (delta: number) => {
    updateChainStepRepeat(activeIndex, delta);
  };

  return (
    <div className="bg-instrument flex h-full flex-col gap-5 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-foreground-muted text-xs tracking-[0.2em] uppercase">
            vari chain edit
          </p>
          <p className="text-foreground-emphasis text-lg font-semibold">
            Step {activeIndex + 1} / {MAX_CHAIN_STEPS}
          </p>
        </div>
        <div
          className={cn(
            "rounded-full border px-3 py-1 text-xs uppercase",
            chainEnabled
              ? "border-primary/60 text-primary"
              : "border-foreground-muted text-foreground-muted",
          )}
        >
          {chainEnabled ? "Playback on" : "Playback off"}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {chain.steps.map((step, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={`${step.variation}-${idx}`}
              type="button"
              onClick={() => setChainEditStep(idx)}
              className={cn(
                "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-foreground-muted text-foreground",
              )}
            >
              <span className="font-semibold">
                {VARIATION_LABELS[step.variation]}
              </span>
              <span className="text-foreground-muted text-xs">
                ×{step.repeats}
              </span>
            </button>
          );
        })}

        {chain.steps.length < MAX_CHAIN_STEPS && (
          <button
            type="button"
            onClick={() => setChainEditStep(chain.steps.length)}
            className="border-foreground-muted text-foreground-muted hover:border-primary hover:text-primary rounded-md border border-dashed px-3 py-2 text-xs uppercase transition-colors"
          >
            Slot {chain.steps.length + 1}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="hardware"
          size="sm"
          onClick={() => handleRepeatAdjust(-1)}
          disabled={!activeStep || repeats <= MIN_CHAIN_REPEAT}
        >
          -
        </Button>
        <div className="text-sm">
          Repeat count:{" "}
          <span className="text-foreground-emphasis font-semibold">
            {repeats}
          </span>
        </div>
        <Button
          variant="hardware"
          size="sm"
          onClick={() => handleRepeatAdjust(1)}
          disabled={!activeStep || repeats >= MAX_CHAIN_REPEAT}
        >
          +
        </Button>
      </div>

      <div className="text-foreground-muted space-y-1 text-xs">
        <p>
          Tap A/B/C/D to set the highlighted slot. The cursor advances
          automatically until you reach {MAX_CHAIN_STEPS} steps.
        </p>
        <p>
          Repeats clamp between {MIN_CHAIN_REPEAT}-{MAX_CHAIN_REPEAT}. Use the
          repeat buttons to fine-tune fills.
        </p>
        <p>Press VARI CHAIN again to exit and keep your punched-in order.</p>
      </div>
    </div>
  );
};
