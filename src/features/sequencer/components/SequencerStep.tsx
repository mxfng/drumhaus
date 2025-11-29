import React, { useEffect, useRef } from "react";

import { getCurrentStepFromTransport } from "@/core/audio/engine/transport";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { cn } from "@/shared/lib/utils";

interface SequencerStepProps {
  stepIndex: number;
  isTriggerOn: boolean;
  isGhosted: boolean;
  variant?: "desktop" | "mobile";
  variation?: number;
  playbackVariation?: number;
  onPointerStart: (stepIndex: number, isTriggerOn: boolean) => void;
  onPointerEnter: (stepIndex: number, isTriggerOn: boolean) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
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
}) => {
  const stepRef = useRef<HTMLDivElement>(null);

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

    let animationId: number;

    const updateCurrentStep = () => {
      const { isPlaying } = useTransportStore.getState();
      const currentStepIndex = isPlaying ? getCurrentStepFromTransport() : -1;

      const isThisStepPlaying =
        isPlaying &&
        playbackVariation === variation &&
        currentStepIndex === stepIndex;

      // Update brightness directly without triggering React re-render
      if (stepRef.current) {
        if (isThisStepPlaying) {
          stepRef.current.style.filter = "brightness(0.75)";
        } else {
          stepRef.current.style.filter = "";
        }
      }

      animationId = requestAnimationFrame(updateCurrentStep);
    };

    animationId = requestAnimationFrame(updateCurrentStep);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stepIndex, variation, playbackVariation, variant]);

  const triggerStyles = {
    className: isTriggerOn
      ? "bg-primary shadow-neu hover:primary-muted"
      : variant === "desktop"
        ? "bg-instrument shadow-[0_4px_8px_rgba(176,147,116,1)_inset] hover:bg-primary-muted/40"
        : "bg-instrument",
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
      ? "rounded-[0_8px_0_8px] sm:rounded-[0_22px_0_22px]"
      : "";

  const sizeClasses =
    variant === "desktop" ? "aspect-square w-full" : "h-full w-full";

  return (
    <div
      ref={stepRef}
      data-step-index={stepIndex}
      onPointerDown={() => onPointerStart(stepIndex, isTriggerOn)}
      onPointerEnter={() => onPointerEnter(stepIndex, isTriggerOn)}
      onPointerMove={onPointerMove}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "relative cursor-pointer overflow-hidden transition-all duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
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
