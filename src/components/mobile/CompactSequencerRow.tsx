import React from "react";

import { SequencerStep } from "@/components/sequencer/SequencerStep";
import { useSequencerDragPaint } from "@/hooks/sequencer/useSequencerDragPaint";
import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";

interface CompactSequencerRowProps {
  voiceIndex: number;
  variation: number;
  triggers: boolean[];
  onToggleStep: (stepIndex: number) => void;
}

export const CompactSequencerRow: React.FC<CompactSequencerRowProps> = ({
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
      className="grid h-full grid-cols-16 gap-[1px]"
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
