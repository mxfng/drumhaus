import React, { useEffect, useState } from "react";

import { clampVelocity } from "@/features/sequencer/lib/helpers";
import { subscribeToPadState } from "@/features/sequencer/lib/padStateManager";
import { cn } from "@/shared/lib/utils";

interface SequencerVelocityProps {
  stepIndex: number;
  velocityValue: number;
  onSetVelocity: (stepIndex: number, velocity: number) => void;
}

export const SequencerVelocity: React.FC<SequencerVelocityProps> = ({
  stepIndex,
  velocityValue,
  onSetVelocity,
}) => {
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);
  const [isTriggerOn, setIsTriggerOn] = useState<boolean>(false);

  // Subscribe to pad state manager for trigger state
  useEffect(() => {
    const unsubscribe = subscribeToPadState(stepIndex, (padState) => {
      setIsTriggerOn(padState.isTriggerOn);
    });

    return unsubscribe;
  }, [stepIndex]);

  const updateVelocityFromPointer = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const divWidth = rect.width;
    const inset = 2;
    const adjustedX = pointerX - inset;
    const adjustedWidth = divWidth - inset * 2;
    const velocity = clampVelocity(adjustedX / adjustedWidth);
    onSetVelocity(stepIndex, velocity);
  };

  const handleVelocityPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    setIsAdjusting(true);
    updateVelocityFromPointer(event);
    // Capture pointer to track movement outside the element
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleVelocityPointerMove = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (isAdjusting) {
      updateVelocityFromPointer(event);
    }
  };

  const handlePointerUp = () => {
    setIsAdjusting(false);
  };

  React.useEffect(() => {
    if (isAdjusting) {
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
  }, [isAdjusting]);

  const velocityWidth = Math.max(velocityValue * 100, 12);

  return (
    <div
      className={cn(
        "group outline-primary relative mt-3 h-3.5 w-full overflow-hidden rounded-[200px_0_200px_0] bg-transparent outline-1 transition-all duration-200 ease-in-out",
        isTriggerOn ? "cursor-grab" : "pointer-events-none cursor-default",
      )}
      style={{ opacity: isTriggerOn ? 0.6 : 0 }}
      onPointerDown={handleVelocityPointerDown}
      onPointerMove={handleVelocityPointerMove}
    >
      <div
        className="bg-primary absolute h-full rounded-[200px_0_200px_0] blur-xs"
        style={{ width: `${velocityWidth}%` }}
      />
      <div className="absolute flex h-full w-full items-center justify-center">
        <span className="font-pixel text-foreground-emphasis opacity-0 blur-xs transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:blur-none">
          {(velocityValue * 100).toFixed(0)}
        </span>
      </div>
    </div>
  );
};
