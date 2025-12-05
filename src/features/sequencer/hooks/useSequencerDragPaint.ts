import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

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
  const activeInputRef = useRef<"pointer" | "touch" | null>(null);
  const activePointerIdRef = useRef<number | null>(null);

  const stopDragging = () => {
    setIsDragging(false);
    activeInputRef.current = null;
    activePointerIdRef.current = null;
  };

  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, []);

  const handleStepMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDragging) return;

      const element = document.elementFromPoint(clientX, clientY);
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
    },
    [dragWriteTargetOn, isDragging, triggers, onToggleStep],
  );

  const handleStepPointerStart = (
    event: React.PointerEvent<HTMLButtonElement>,
    stepIndex: number,
    isCurrentlyOn: boolean,
  ) => {
    activeInputRef.current = "pointer";
    activePointerIdRef.current = event.pointerId ?? null;
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    onToggleStep(stepIndex);
  };

  const handleStepTouchStart = (
    _event: React.TouchEvent<HTMLButtonElement>,
    stepIndex: number,
    isCurrentlyOn: boolean,
  ) => {
    // Ignore the synthetic touch event if we've already started handling a pointer sequence.
    if (activeInputRef.current === "pointer") return;
    activeInputRef.current = "touch";
    activePointerIdRef.current = null;
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    onToggleStep(stepIndex);
  };

  const handleStepPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (activeInputRef.current !== "pointer") return;
    if (
      activePointerIdRef.current !== null &&
      event.pointerId !== activePointerIdRef.current
    ) {
      return;
    }
    handleStepMove(event.clientX, event.clientY);
  };

  const handleStepPointerEnter = (
    _event: React.PointerEvent<HTMLButtonElement>,
    stepIndex: number,
    isCurrentlyOn: boolean,
  ) => {
    if (activeInputRef.current === "touch") return;
    const isStateChanging = isCurrentlyOn !== dragWriteTargetOn;
    if (isDragging && isStateChanging) {
      onToggleStep(stepIndex);
    }
  };

  const handleStepTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (activeInputRef.current === "pointer") return;
    const touch = event.touches[0];
    if (touch) {
      handleStepMove(touch.clientX, touch.clientY);
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowPointerMove = (event: PointerEvent) => {
      if (activeInputRef.current !== "pointer") return;
      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      handleStepMove(event.clientX, event.clientY);
    };

    const handleWindowPointerUp = (event: PointerEvent) => {
      if (activeInputRef.current !== "pointer") return;
      if (
        activePointerIdRef.current !== null &&
        event.pointerId !== activePointerIdRef.current
      ) {
        return;
      }
      stopDragging();
    };

    const handleWindowTouchMove = (event: TouchEvent) => {
      if (activeInputRef.current === "pointer") return;
      const touch = event.touches[0];
      if (!touch) return;
      event.preventDefault();
      handleStepMove(touch.clientX, touch.clientY);
    };

    const handleWindowTouchEnd = () => {
      if (activeInputRef.current === "touch") {
        stopDragging();
      }
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp);
    window.addEventListener("pointercancel", handleWindowPointerUp);
    window.addEventListener("touchmove", handleWindowTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleWindowTouchEnd);
    window.addEventListener("touchcancel", handleWindowTouchEnd);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerUp);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
      window.removeEventListener("touchcancel", handleWindowTouchEnd);
    };
  }, [dragWriteTargetOn, isDragging, triggers, handleStepMove]);

  return {
    isDragging,
    dragWriteTargetOn,
    handleStepPointerStart,
    handleStepPointerMove,
    handleStepPointerEnter,

    handleStepTouchStart,
    handleStepTouchMove,
  };
};
