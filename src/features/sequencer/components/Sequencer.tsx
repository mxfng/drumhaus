import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { SequencerStepIndicator } from "@/features/sequencer/components/SequencerStepIndicator";
import { SequencerVelocity } from "@/features/sequencer/components/SequencerVelocity";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";

interface StepMusicalState {
  isTriggerOn: boolean;
  isGhosted: boolean;
  velocityValue: number;
}

export const Sequencer: React.FC = () => {
  // --- Transport Store ---
  const isPlaying = useTransportStore((state) => state.isPlaying);

  // --- Pattern Store ---
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const triggers = usePatternStore(
    (state) => state.pattern[voiceIndex].variations[variation].triggers,
  );
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const setVelocity = usePatternStore((state) => state.setVelocity);

  // --- Drag-paint logic ---
  const {
    handleStepPointerStart,
    handleStepPointerMove,
    handleStepPointerEnter,
  } = useSequencerDragPaint({
    triggers,
    onToggleStep: (stepIndex) => toggleStep(voiceIndex, variation, stepIndex),
  });

  const currentVariation = pattern[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  const getStepMusicalState = (step: number): StepMusicalState => {
    const isTriggerOn = triggers[step];
    const isGhosted =
      isPlaying && playbackVariation !== variation && isTriggerOn;

    return {
      isTriggerOn,
      isGhosted,
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
              isTriggerOn={state.isTriggerOn}
              isGhosted={state.isGhosted}
              variant="desktop"
              onPointerStart={handleStepPointerStart}
              onPointerEnter={handleStepPointerEnter}
              onPointerMove={handleStepPointerMove}
            />
            <SequencerVelocity
              stepIndex={step}
              isTriggerOn={state.isTriggerOn}
              velocityValue={state.velocityValue}
              onSetVelocity={(stepIndex, velocity) =>
                setVelocity(voiceIndex, variation, stepIndex, velocity)
              }
            />
          </div>
        );
      })}
    </div>
  );
};
