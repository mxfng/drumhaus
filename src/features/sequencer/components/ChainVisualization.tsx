import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { SequencerStepIndicator } from "./SequencerStepIndicator";

/**
 * Visualizes the chain being built in edit mode
 * Shows 2 steps per bar, filling from left to right
 * Reuses existing sequencer components for consistency
 */
export const ChainVisualization: React.FC = () => {
  const chainDraft = usePatternStore((state) => state.chainDraft);

  // Calculate total bars in the chain
  const totalBars = chainDraft.steps.reduce(
    (sum, step) => sum + step.repeats,
    0,
  );

  // Generate array of step indices (0-15)
  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  // Determine which variation each step belongs to (null if empty)
  const getStepVariation = (stepIndex: number): number | null => {
    // Each bar is 2 steps
    const barIndex = Math.floor(stepIndex / 2);

    if (barIndex >= totalBars) {
      return null; // Empty step
    }

    // Find which variation this bar belongs to
    let currentBar = 0;
    for (const step of chainDraft.steps) {
      if (barIndex < currentBar + step.repeats) {
        return step.variation;
      }
      currentBar += step.repeats;
    }

    return null;
  };

  // Color palette for variations (matching the colors I used before)
  const variationColors = [
    "bg-blue-500/30 border-blue-500/50", // A
    "bg-green-500/30 border-green-500/50", // B
    "bg-yellow-500/30 border-yellow-500/50", // C
    "bg-red-500/30 border-red-500/50", // D
  ];

  return (
    <div
      key="chain-visualization-grid"
      className="grid h-40 w-full grid-cols-16 gap-4 p-6"
    >
      {steps.map((step) => {
        const variation = getStepVariation(step);
        const isEmpty = variation === null;
        const isTriggerOn = !isEmpty;

        return (
          <div key={`chain-vis-step-${step}`} className="col-span-1">
            {/* Step indicator - pass 0 for both since we're not in playback mode */}
            <SequencerStepIndicator
              stepIndex={step}
              variation={0}
              playbackVariation={0}
            />
            {/* Reuse existing SequencerStep with custom color */}
            <SequencerStep
              stepIndex={step}
              isTriggerOn={isTriggerOn}
              brightness={1}
              color={!isEmpty ? variationColors[variation] : undefined}
              disabled
            />

            {/* Empty velocity space */}
            <div className="mt-3 h-3.5 w-full" />
          </div>
        );
      })}
    </div>
  );
};
