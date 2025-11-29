import { useEffect, useRef, useState } from "react";

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
  const touchActiveRef = useRef<boolean>(false);

  const handleMouseUp = () => {
    setIsDragging(false);
    setTimeout(() => {
      touchActiveRef.current = false;
    }, 300);
  };

  const handleStepMouseStart = (stepIndex: number, isCurrentlyOn: boolean) => {
    if (touchActiveRef.current) return;
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    onToggleStep(stepIndex);
  };

  const handleStepTouchStart = (stepIndex: number, isCurrentlyOn: boolean) => {
    touchActiveRef.current = true;
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    onToggleStep(stepIndex);
  };

  const handleStepTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    const touch = event.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
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

  const handleStepMouseEnter = (stepIndex: number, isCurrentlyOn: boolean) => {
    const isStateChanging = isCurrentlyOn !== dragWriteTargetOn;
    if (isDragging && isStateChanging) {
      onToggleStep(stepIndex);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
      window.addEventListener("touchend", handleMouseUp);
      window.addEventListener("touchcancel", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
      window.removeEventListener("touchcancel", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleMouseUp);
      window.removeEventListener("touchcancel", handleMouseUp);
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
    handleStepMouseStart,
    handleStepTouchStart,
    handleStepTouchMove,
    handleStepMouseEnter,
  };
};
