import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { useTransportStore } from "@/stores/useTransportStore";

interface StepIndicatorProps {
  stepIndex: number;
  variation: number;
  playbackVariation: number;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  stepIndex,
  variation,
  playbackVariation,
}) => {
  const indicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const updateIndicator = () => {
      const { stepIndex: currentStepIndex, isPlaying } =
        useTransportStore.getState();

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
        // Update className
        const newClassName = cn(
          "mb-4 h-1 w-full rounded-full transition-all duration-75",
          indicatorIsOn ? "bg-primary" : "bg-foreground",
        );
        indicatorRef.current.className = newClassName;

        // Update opacity and LED glow effect
        const opacity = indicatorIsOn ? 1 : isAccentBeat ? 0.6 : 0.2;
        indicatorRef.current.style.opacity = String(opacity);

        // Add LED backlight glow effect when active
        if (indicatorIsOn) {
          indicatorRef.current.style.boxShadow =
            "0 0 8px 2px hsl(var(--primary)), 0 0 4px 1px hsl(var(--primary))";
        } else {
          indicatorRef.current.style.boxShadow = "none";
        }
      }

      animationFrameId = requestAnimationFrame(updateIndicator);
    };

    animationFrameId = requestAnimationFrame(updateIndicator);

    return () => {
      cancelAnimationFrame(animationFrameId);
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
