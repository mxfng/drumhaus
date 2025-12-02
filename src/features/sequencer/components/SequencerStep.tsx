import React, { useEffect, useRef } from "react";

import { subscribeToStepUpdates } from "@/features/sequencer/lib/stepTicker";
import { cn } from "@/shared/lib/utils";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";

interface SequencerStepProps {
  stepIndex: number;
  isTriggerOn: boolean;
  isGhosted: boolean;
  variant?: "desktop" | "mobile";
  variation?: number;
  playbackVariation?: number;
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
  isGhosted,
  variant = "desktop",
  variation,
  playbackVariation,
  onPointerStart,
  onPointerEnter,
  onPointerMove,
  onTouchStart,
  onTouchMove,
}) => {
  const stepRef = useRef<HTMLDivElement>(null);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);

  // Accent beats (every 4th step) for visual emphasis
  const isAccentBeat = stepIndex % 4 === 0;

  // Track current step for mobile variant using requestAnimationFrame
  useEffect(() => {
    if (
      variant !== "mobile" ||
      variation === undefined ||
      playbackVariation === undefined
    ) {
      return;
    }

    let lastIsThisStepPlaying: boolean | null = null;

    const unsubscribe = subscribeToStepUpdates(({ currentStep, isPlaying }) => {
      const isThisStepPlaying =
        isPlaying &&
        playbackVariation === variation &&
        currentStep === stepIndex;

      // Only touch the DOM when the state actually changes
      if (
        stepRef.current &&
        (lastIsThisStepPlaying === null ||
          isThisStepPlaying !== lastIsThisStepPlaying)
      ) {
        stepRef.current.classList.toggle("brightness-75", isThisStepPlaying);
        lastIsThisStepPlaying = isThisStepPlaying;
      }
    });

    return unsubscribe;
  }, [stepIndex, variation, playbackVariation, variant]);

  const getTriggerClassName = () => {
    if (potatoMode) {
      return isTriggerOn ? "bg-primary" : "bg-instrument";
    }

    return isTriggerOn
      ? "bg-primary shadow-neu hover:primary-muted"
      : variant === "desktop"
        ? "bg-instrument shadow-[0_4px_8px_rgba(176,147,116,0.3)_inset] hover:bg-primary-muted/40"
        : "bg-instrument";
  };

  const triggerStyles = {
    className: getTriggerClassName(),
    opacity: isGhosted
      ? 0.7
      : isTriggerOn
        ? 1
        : variant === "mobile" && !isTriggerOn
          ? isAccentBeat
            ? 1
            : 0.75
          : 1,
  };

  const borderRadius =
    variant === "desktop"
      ? "rounded-[0_8px_0_8px] sm:rounded-[0_16px_0_16px]"
      : "";

  const sizeClasses =
    variant === "desktop" ? "aspect-square w-full" : "h-full w-full";

  return (
    <div
      ref={stepRef}
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
        "border-border relative cursor-pointer overflow-hidden border",
        potatoMode
          ? "transition-none"
          : "transition-[background-color,box-shadow] duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
      )}
      style={{
        opacity: triggerStyles.opacity,
      }}
    >
      {isTriggerOn && !potatoMode && (
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
