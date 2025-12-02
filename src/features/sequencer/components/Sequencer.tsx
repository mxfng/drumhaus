import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { SequencerStepIndicator } from "@/features/sequencer/components/SequencerStepIndicator";
import { SequencerVelocity } from "@/features/sequencer/components/SequencerVelocity";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";

interface StepMusicalState {
  velocityValue: number;
}

export const Sequencer: React.FC = () => {
  // --- Pattern Store ---
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const mode = usePatternStore((state) => state.mode);
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const toggleAccent = usePatternStore((state) => state.toggleAccent);
  const setVelocity = usePatternStore((state) => state.setVelocity);

  const accentMode = mode.type === "accent";
  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;

  // Get appropriate triggers based on mode
  const triggers = accentMode
    ? pattern.variationMetadata[variation].accent
    : pattern.voices[voiceIndex].variations[variation].triggers;

  // --- Drag-paint logic ---
  const {
    handleStepPointerStart,
    handleStepPointerMove,
    handleStepPointerEnter,
  } = useSequencerDragPaint({
    triggers,
    onToggleStep: (stepIndex) =>
      accentMode
        ? toggleAccent(variation, stepIndex)
        : toggleStep(voiceIndex, variation, stepIndex),
  });

  const currentVariation = pattern.voices[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  const getStepMusicalState = (step: number): StepMusicalState => {
    return {
      velocityValue: velocities[step],
    };
  };

  return (
    <div
      key="sequence-grid"
      className="grid h-full w-full grid-cols-8 gap-x-1 gap-y-3 sm:grid-cols-16 sm:gap-4"
      onPointerMove={handleStepPointerMove}
    >
      {steps.map((step) => {
        const state = getStepMusicalState(step);

        return (
          <div key={`sequence-step-item-${step}`} className="col-span-1">
            <SequencerStepIndicator
              stepIndex={step}
              variation={variation}
              playbackVariation={playbackVariation}
            />
            <SequencerStep
              stepIndex={step}
              variant="desktop"
              onPointerStart={handleStepPointerStart}
              onPointerEnter={handleStepPointerEnter}
              onPointerMove={handleStepPointerMove}
            />
            {/* Hide velocity controls in accent mode */}
            {!accentMode && (
              <SequencerVelocity
                stepIndex={step}
                velocityValue={state.velocityValue}
                onSetVelocity={(stepIndex, velocity) =>
                  setVelocity(voiceIndex, variation, stepIndex, velocity)
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
