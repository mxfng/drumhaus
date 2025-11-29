import { useEffect, useState } from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";

interface UseSequencerDragPaintProps {
  triggers: boolean[];
  onToggleStep: (stepIndex: number) => void;
}

export const useSequencerDragPaint = ({
  triggers,
  onToggleStep,
}: UseSequencerDragPaintProps) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragWriteTargetOn, setDragWriteTargetOn] = useState<boolean>(true);

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleStepPointerStart = (
    stepIndex: number,
    isCurrentlyOn: boolean,
  ) => {
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    onToggleStep(stepIndex);
  };

  const handleStepPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const stepElement = element?.closest("[data-step-index]");

    if (stepElement) {
      const stepIndex = parseInt(
        stepElement.getAttribute("data-step-index") || "-1",
      );
      if (stepIndex >= 0 && stepIndex < STEP_COUNT) {
        const isTriggerOn = triggers[stepIndex];
        const isStateChanging = isTriggerOn !== dragWriteTargetOn;
        if (isStateChanging) {
          onToggleStep(stepIndex);
        }
      }
    }
  };

  const handleStepPointerEnter = (
    stepIndex: number,
    isCurrentlyOn: boolean,
  ) => {
    const isStateChanging = isCurrentlyOn !== dragWriteTargetOn;
    if (isDragging && isStateChanging) {
      onToggleStep(stepIndex);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    } else {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isDragging]);

  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, []);

  return {
    isDragging,
    dragWriteTargetOn,
    handleStepPointerStart,
    handleStepPointerMove,
    handleStepPointerEnter,
  };
};
