import React, { useState } from "react";

import { clampVelocity } from "@/lib/pattern/helpers";
import { cn } from "@/lib/utils";

interface SequencerVelocityProps {
  stepIndex: number;
  isTriggerOn: boolean;
  velocityValue: number;
  onSetVelocity: (stepIndex: number, velocity: number) => void;
}

export const SequencerVelocity: React.FC<SequencerVelocityProps> = ({
  stepIndex,
  isTriggerOn,
  velocityValue,
  onSetVelocity,
}) => {
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false);

  const updateVelocityFromPointer = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const divWidth = rect.width;
    const inset = 2;
    const adjustedX = mouseX - inset;
    const adjustedWidth = divWidth - inset * 2;
    const velocity = clampVelocity(adjustedX / adjustedWidth);
    onSetVelocity(stepIndex, velocity);
  };

  const handleVelocityMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsAdjusting(true);
    updateVelocityFromPointer(event);
  };

  const handleVelocityMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isAdjusting) {
      updateVelocityFromPointer(event);
    }
  };

  const handleMouseUp = () => {
    setIsAdjusting(false);
  };

  React.useEffect(() => {
    if (isAdjusting) {
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isAdjusting]);

  const velocityWidth = Math.max(velocityValue * 100, 12);

  return (
    <div
      className={cn(
        "group outline-primary relative mt-2 h-4 w-full overflow-hidden rounded-[200px_0_200px_0] bg-transparent outline-1 transition-all duration-200 ease-in-out sm:mt-3 sm:h-3.5",
        "hidden sm:block",
        isTriggerOn ? "cursor-grab" : "pointer-events-none cursor-default",
      )}
      style={{ opacity: isTriggerOn ? 0.6 : 0 }}
      onMouseDown={handleVelocityMouseDown}
      onMouseMove={handleVelocityMouseMove}
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
