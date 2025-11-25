import { useEffect, useRef } from "react";
import { getTransport, Ticks } from "tone";

import { SEQUENCE_SUBDIVISION, STEP_COUNT } from "@/lib/audio/engine/constants";
import { useTransportStore } from "@/stores/useTransportStore";

interface StepIndicatorProps {
  stepIndex: number;
  variation: number;
  playbackVariation: number;
}

/**
 * Calculate current step index (0-15) from transport ticks
 */
function getCurrentStepFromTransport(): number {
  const transport = getTransport();
  const ticks = transport.ticks;
  const ticksPerStep = Ticks(SEQUENCE_SUBDIVISION).valueOf();
  const currentStep = Math.floor(ticks / ticksPerStep) % STEP_COUNT;
  return currentStep;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  stepIndex,
  variation,
  playbackVariation,
}) => {
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationId: number;

    const updateIndicator = () => {
      const { isPlaying } = useTransportStore.getState();
      const currentStepIndex = isPlaying ? getCurrentStepFromTransport() : 0;

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
        indicatorRef.current.className = indicatorIsOn
          ? "mb-4 h-1 w-full rounded-full transition-all duration-75 bg-primary"
          : "mb-4 h-1 w-full rounded-full transition-all duration-75 bg-foreground";

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
  }, [stepIndex, variation, playbackVariation]);

  return (
    <div
      ref={indicatorRef}
      className="bg-foreground mb-4 h-1 w-full rounded-full transition-all duration-75"
      style={{ opacity: 0.2 }}
    />
  );
};
