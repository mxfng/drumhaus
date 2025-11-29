import { useEffect, useRef } from "react";

import { subscribeToStepUpdates } from "@/features/sequencer/lib/stepTicker";
import { cn } from "@/shared/lib/utils";

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
    "sm:mb-4 h-2 sm:h-1 w-full sm:rounded-full sm:transition-all sm:duration-75";

  useEffect(() => {
    let lastIndicatorOn: boolean | null = null;
    let lastOpacity: string | null = null;

    const unsubscribe = subscribeToStepUpdates(({ currentStep, isPlaying }) => {
      const isAccentBeat = stepIndex % 4 === 0;
      const isStepPlaying =
        isPlaying &&
        playbackVariation === variation &&
        currentStep === stepIndex;
      const isAccentPlayingOtherVariation =
        isPlaying &&
        playbackVariation !== variation &&
        isAccentBeat &&
        currentStep === stepIndex;

      const indicatorIsOn = isStepPlaying || isAccentPlayingOtherVariation;

      if (!indicatorRef.current) return;

      const opacity = indicatorIsOn ? "1" : isAccentBeat ? "0.6" : "0.2";
      const shouldUpdateOpacity =
        lastOpacity === null || opacity !== lastOpacity;
      const shouldUpdateClass =
        lastIndicatorOn === null || indicatorIsOn !== lastIndicatorOn;

      if (shouldUpdateOpacity) {
        indicatorRef.current.style.opacity = opacity;
        lastOpacity = opacity;
      }

      if (shouldUpdateClass) {
        indicatorRef.current.className = cn(
          baseClassName,
          indicatorIsOn ? "bg-primary" : "bg-foreground",
        );

        indicatorRef.current.style.boxShadow = indicatorIsOn
          ? "0 0 8px 2px hsl(var(--primary)), 0 0 4px 1px hsl(var(--primary))"
          : "none";

        lastIndicatorOn = indicatorIsOn;
      }
    });

    return unsubscribe;
  }, [stepIndex, variation, playbackVariation, baseClassName]);

  return (
    <div
      ref={indicatorRef}
      className={baseClassName}
      style={{ opacity: 0.2 }}
    />
  );
};
