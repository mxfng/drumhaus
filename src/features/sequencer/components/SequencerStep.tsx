import React from "react";

import { cn } from "@/shared/lib/utils";
import { useLightNode } from "@/shared/lightshow";

interface SequencerStepProps {
  stepIndex: number;
  isTriggerOn: boolean;
  brightness: number;
  isGuideActive?: boolean;
  color?: string; // Optional custom color class for override
  // Click handler for keyboard accessibility (Enter key)
  onClick?: (stepIndex: number) => void;
  // Pointer handlers for desktop
  onPointerStart?: (
    event: React.PointerEvent<HTMLButtonElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onPointerEnter?: (
    event: React.PointerEvent<HTMLButtonElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLButtonElement>) => void;
  // Touch handlers for mobile (required for iOS Safari)
  onTouchStart?: (
    event: React.TouchEvent<HTMLButtonElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onTouchMove?: (event: React.TouchEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}

export const SequencerStep: React.FC<SequencerStepProps> = ({
  stepIndex,
  isTriggerOn,
  brightness,
  isGuideActive = false,
  color,
  onClick,
  onPointerStart,
  onPointerEnter,
  onPointerMove,
  onTouchStart,
  onTouchMove,
  disabled = false,
}) => {
  // Accent beats (every 4th step) for visual emphasis
  const isAccentBeat = stepIndex % 4 === 0;
  const isGuideOnly = isGuideActive && !isTriggerOn;

  const getTriggerClassName = () => {
    // Use custom color if provided
    if (color && isTriggerOn) {
      return color;
    }

    return isTriggerOn
      ? "bg-primary shadow-neu hover:accent"
      : isGuideOnly
        ? "bg-background shadow-[0_4px_8px_rgba(176,147,116,0.35)_inset] hover:bg-foreground-muted/90"
        : "bg-secondary shadow-[0_4px_8px_rgba(176,147,116,0.3)_inset] hover:bg-accent/40";
  };

  const triggerStyles = {
    className: getTriggerClassName(),
    opacity: isTriggerOn || isGuideOnly ? 1 : isAccentBeat ? 1 : 0.75,
  };

  const borderRadius = "rounded-[0_16px_0_16px]";

  const sizeClasses = "aspect-square w-full";
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  useLightNode(buttonRef, {
    group: "sequencer-step",
    weight: 0.8,
  });

  return (
    <button
      ref={buttonRef}
      data-step-index={stepIndex}
      onClick={(event) => {
        if (disabled) return;
        // Only trigger on keyboard clicks (Enter key), not pointer/mouse events
        if (event.detail === 0) {
          onClick?.(stepIndex);
        }
      }}
      onPointerDown={(event) => {
        if (disabled) return;
        onPointerStart?.(event, stepIndex, isTriggerOn);
      }}
      onPointerEnter={(event) => {
        if (disabled) return;
        onPointerEnter?.(event, stepIndex, isTriggerOn);
      }}
      onPointerMove={(event) => {
        if (disabled) return;
        onPointerMove?.(event);
      }}
      onTouchStart={(event) => {
        if (disabled) return;
        onTouchStart?.(event, stepIndex, isTriggerOn);
      }}
      onTouchMove={(event) => {
        if (disabled) return;
        onTouchMove?.(event);
      }}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      type="button"
      className={cn(
        "relative overflow-hidden border transition-[background-color,box-shadow,opacity] duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
      )}
    >
      {(isTriggerOn || isGuideOnly) && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_55%)] disabled:opacity-50",
            borderRadius,
          )}
          style={{
            opacity: brightness !== 1 ? brightness : triggerStyles.opacity,
          }}
        />
      )}
    </button>
  );
};
