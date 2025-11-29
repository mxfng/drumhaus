import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";

interface MobileSequencerRowProps {
  voiceIndex: number;
  variation: number;
  triggers: boolean[];
  onToggleStep: (stepIndex: number) => void;
}

export const MobileSequencerRow: React.FC<MobileSequencerRowProps> = ({
  voiceIndex,
  variation,
  triggers,
  onToggleStep,
}) => {
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);

  const {
    handleStepMouseStart,
    handleStepTouchStart,
    handleStepTouchMove,
    handleStepMouseEnter,
  } = useSequencerDragPaint({
    triggers,
    onToggleStep,
  });

  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  return (
    <div
      className="grid h-full grid-cols-16 gap-px"
      onTouchMove={handleStepTouchMove}
    >
      {steps.map((step) => {
        const isTriggerOn = triggers[step];
        const isGhosted =
          isPlaying && playbackVariation !== variation && isTriggerOn;

        return (
          <SequencerStep
            key={`compact-step-${voiceIndex}-${step}`}
            stepIndex={step}
            isTriggerOn={isTriggerOn}
            isGhosted={isGhosted}
            variant="mobile"
            variation={variation}
            playbackVariation={playbackVariation}
            onMouseDown={handleStepMouseStart}
            onMouseEnter={handleStepMouseEnter}
            onTouchStart={(_, stepIndex, isTriggerOn) =>
              handleStepTouchStart(stepIndex, isTriggerOn)
            }
          />
        );
      })}
    </div>
  );
};
