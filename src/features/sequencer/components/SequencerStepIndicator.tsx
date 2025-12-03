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

  const baseClassName = "mb-4 h-1 w-full rounded-full";

  useEffect(() => {
    let lastIndicatorOn: boolean | null = null;
    let lastOpacityClass: string | null = null;

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

      const opacityClass = indicatorIsOn
        ? "opacity-100"
        : isAccentBeat
          ? "opacity-60"
          : "opacity-20";

      if (opacityClass !== lastOpacityClass) {
        indicatorRef.current.classList.remove(
          "opacity-100",
          "opacity-60",
          "opacity-20",
        );
        indicatorRef.current.classList.add(opacityClass);
        lastOpacityClass = opacityClass;
      }

      if (indicatorIsOn !== lastIndicatorOn) {
        indicatorRef.current.classList.toggle("bg-primary", indicatorIsOn);
        indicatorRef.current.classList.toggle(
          "bg-foreground-emphasis",
          !indicatorIsOn,
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
      className={cn(baseClassName, "bg-foreground-emphasis", "opacity-20")}
    />
  );
};
