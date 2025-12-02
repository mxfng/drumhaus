import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";

interface MobileSequencerRowProps {
  voiceIndex: number;
  variation: number;
  triggers: boolean[];
  onToggleStep: (stepIndex: number) => void;
}

export const MobileSequencerRow: React.FC<MobileSequencerRowProps> = ({
  voiceIndex,
  triggers,
  onToggleStep,
}) => {
  const {
    handleStepPointerStart,
    handleStepTouchStart,
    handleStepPointerMove,
    handleStepPointerEnter,
    handleStepTouchMove,
  } = useSequencerDragPaint({
    triggers,
    onToggleStep,
  });

  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  return (
    <div className="grid h-full touch-none grid-cols-16 gap-px">
      {steps.map((step) => (
        <SequencerStep
          key={`compact-step-${voiceIndex}-${step}`}
          stepIndex={step}
          variant="mobile"
          onPointerStart={handleStepPointerStart}
          onPointerMove={handleStepPointerMove}
          onPointerEnter={handleStepPointerEnter}
          onTouchStart={handleStepTouchStart}
          onTouchMove={handleStepTouchMove}
        />
      ))}
    </div>
  );
};
