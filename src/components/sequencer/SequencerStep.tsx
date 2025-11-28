import React from "react";

import { useCurrentStep } from "@/hooks/sequencer/useCurrentStep";
import { cn } from "@/lib/utils";

interface SequencerStepProps {
  stepIndex: number;
  isTriggerOn: boolean;
  isGhosted: boolean;
  variant?: "desktop" | "mobile";
  variation?: number;
  playbackVariation?: number;
  onMouseDown: (stepIndex: number, isTriggerOn: boolean) => void;
  onMouseEnter: (stepIndex: number, isTriggerOn: boolean) => void;
  onTouchStart: (
    event: React.TouchEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
}

export const SequencerStep: React.FC<SequencerStepProps> = ({
  stepIndex,
  isTriggerOn,
  isGhosted,
  variant = "desktop",
  variation,
  playbackVariation,
  onMouseDown,
  onMouseEnter,
  onTouchStart,
}) => {
  // Track current step for mobile variant only
  const isCurrentStep = useCurrentStep(
    stepIndex,
    variant === "mobile" ? variation : undefined,
    variant === "mobile" ? playbackVariation : undefined,
  );

  // Accent beats (every 4th step) for visual emphasis
  const isAccentBeat = stepIndex % 4 === 0;

  const triggerStyles = {
    className: isTriggerOn
      ? "bg-primary shadow-neu hover:primary-muted"
      : variant === "desktop"
        ? "bg-instrument shadow-[0_4px_8px_rgba(176,147,116,1)_inset] hover:bg-primary-muted/40"
        : "bg-instrument h-full",
    opacity: isGhosted
      ? 0.7
      : isTriggerOn
        ? 1
        : variant === "mobile" && !isTriggerOn
          ? isAccentBeat
            ? 0.6
            : 0.2
          : 1,
  };

  const borderRadius =
    variant === "desktop"
      ? "rounded-[0_8px_0_8px] sm:rounded-[0_22px_0_22px]"
      : "";

  const sizeClasses =
    variant === "desktop" ? "aspect-square w-full" : "h-full w-full";

  return (
    <div
      data-step-index={stepIndex}
      onMouseDown={() => onMouseDown(stepIndex, isTriggerOn)}
      onMouseEnter={() => onMouseEnter(stepIndex, isTriggerOn)}
      onTouchStart={(e) => {
        e.preventDefault();
        onTouchStart(e, stepIndex, isTriggerOn);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
        variant === "mobile" && isCurrentStep && "brightness-75",
      )}
      style={{
        opacity: triggerStyles.opacity,
      }}
    >
      {isTriggerOn && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_55%)]",
            borderRadius,
          )}
        />
      )}
    </div>
  );
};
