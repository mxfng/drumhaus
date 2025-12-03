import React from "react";

import { cn } from "@/shared/lib/utils";

interface SequencerStepProps {
  stepIndex: number;
  isTriggerOn: boolean;
  brightness: number;
  isGuideActive?: boolean;
  // Pointer handlers for desktop
  onPointerStart?: (
    event: React.PointerEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onPointerEnter?: (
    event: React.PointerEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  // Touch handlers for mobile (required for iOS Safari)
  onTouchStart?: (
    event: React.TouchEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onTouchMove?: (event: React.TouchEvent<HTMLDivElement>) => void;
}

export const SequencerStep: React.FC<SequencerStepProps> = ({
  stepIndex,
  isTriggerOn,
  brightness,
  isGuideActive = false,
  onPointerStart,
  onPointerEnter,
  onPointerMove,
  onTouchStart,
  onTouchMove,
}) => {
  // Accent beats (every 4th step) for visual emphasis
  const isAccentBeat = stepIndex % 4 === 0;
  const isGuideOnly = isGuideActive && !isTriggerOn;

  const getTriggerClassName = () => {
    return isTriggerOn
      ? "bg-primary shadow-neu hover:primary-muted"
      : isGuideOnly
        ? "bg-background shadow-[0_4px_8px_rgba(176,147,116,0.35)_inset] hover:bg-foreground-muted/90"
        : "bg-instrument shadow-[0_4px_8px_rgba(176,147,116,0.3)_inset] hover:bg-primary-muted/40";
  };

  const triggerStyles = {
    className: getTriggerClassName(),
    opacity: isTriggerOn || isGuideOnly ? 1 : isAccentBeat ? 1 : 0.75,
  };

  const borderRadius = "rounded-[0_16px_0_16px]";

  const sizeClasses = "aspect-square w-full";

  return (
    <div
      data-step-index={stepIndex}
      onPointerDown={(event) => onPointerStart?.(event, stepIndex, isTriggerOn)}
      onPointerEnter={(event) =>
        onPointerEnter?.(event, stepIndex, isTriggerOn)
      }
      onPointerMove={(event) => {
        onPointerMove?.(event);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event, stepIndex, isTriggerOn);
      }}
      onTouchMove={(event) => {
        onTouchMove?.(event);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "border-border relative cursor-pointer overflow-hidden border transition-[background-color,box-shadow,opacity] duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
      )}
      style={{
        opacity: brightness !== 1 ? brightness : triggerStyles.opacity,
      }}
    >
      {(isTriggerOn || isGuideOnly) && (
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
