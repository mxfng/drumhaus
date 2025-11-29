import { useEffect, useRef } from "react";

import { getCurrentStepFromTransport } from "@/lib/audio/engine/transport";
import { cn } from "@/lib/utils";
import { useTransportStore } from "@/stores/useTransportStore";

interface SequencerStepIndicatorProps {
  stepIndex: number;
  variation: number;
  playbackVariation: number;
}

export const SequencerStepIndicator: React.FC<SequencerStepIndicatorProps> = ({
  stepIndex,
  variation,
  playbackVariation,
}) => {
  const indicatorRef = useRef<HTMLDivElement>(null);

  const baseClassName =
    "sm:mb-4 h-2 sm:h-1 w-full sm:rounded-full transition-all duration-75";

  useEffect(() => {
    let animationId: number;

    const updateIndicator = () => {
      const { isPlaying } = useTransportStore.getState();
      const currentStepIndex = isPlaying ? getCurrentStepFromTransport() : -1;

      const isAccentBeat = stepIndex % 4 === 0;
      const isStepPlaying =
        isPlaying &&
        playbackVariation === variation &&
        currentStepIndex === stepIndex;
      const isAccentPlayingOtherVariation =
        isPlaying &&
        playbackVariation !== variation &&
        isAccentBeat &&
        currentStepIndex === stepIndex;

      const indicatorIsOn = isStepPlaying || isAccentPlayingOtherVariation;

      // Update DOM directly without triggering React re-render
      if (indicatorRef.current) {
        const opacity = indicatorIsOn ? 1 : isAccentBeat ? 0.6 : 0.2;
        indicatorRef.current.style.opacity = String(opacity);

        // Update background color
        indicatorRef.current.className = cn(
          baseClassName,
          indicatorIsOn ? "bg-primary" : "bg-foreground",
        );

        // Update LED glow effect
        indicatorRef.current.style.boxShadow = indicatorIsOn
          ? "0 0 8px 2px hsl(var(--primary)), 0 0 4px 1px hsl(var(--primary))"
          : "none";
      }

      animationId = requestAnimationFrame(updateIndicator);
    };

    animationId = requestAnimationFrame(updateIndicator);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stepIndex, variation, playbackVariation, baseClassName]);

  return (
    <div
      ref={indicatorRef}
      className={baseClassName}
      style={{ opacity: 0.2 }}
    />
  );
};
