import { useEffect, useRef } from "react";

import { subscribeToStepUpdates } from "@/features/sequencer/lib/stepTicker";
import { cn } from "@/shared/lib/utils";
import { useLightNode, useLightRig } from "@/shared/lightshow";

interface SequencerStepIndicatorProps {
  stepIndex: number;
  variation?: number;
  playbackVariation?: number;
}

export const SequencerStepIndicator: React.FC<SequencerStepIndicatorProps> = ({
  stepIndex,
  variation = undefined,
  playbackVariation = undefined,
}) => {
  // --- Lightshow ---
  const indicatorRef = useRef<HTMLDivElement>(null);

  const { isIntroPlaying } = useLightRig();

  useLightNode(indicatorRef, {
    group: "sequencer-indicator",
    weight: 0.4,
  });

  // --- Computed CSS Classes ---

  const baseClassName = "mb-4 h-1 w-full rounded-full";

  const isAccentBeat = stepIndex % 4 === 0;

  // rAF loop to update the indicator
  useEffect(() => {
    if (isIntroPlaying) {
      return;
    }

    const el = indicatorRef.current;
    if (!el) {
      return;
    }

    let lastIndicatorOn: boolean | null = null;

    const unsubscribe = subscribeToStepUpdates(({ currentStep, isPlaying }) => {
      const isCurrentStep = currentStep === stepIndex;
      const inSameVariation = playbackVariation === variation;

      const indicatorIsOn =
        isPlaying &&
        isCurrentStep &&
        (inSameVariation || (isAccentBeat && !inSameVariation));

      if (indicatorIsOn !== lastIndicatorOn) {
        el.classList.toggle("bg-primary", indicatorIsOn);
        el.classList.toggle("bg-foreground-emphasis", !indicatorIsOn);
        el.style.boxShadow = indicatorIsOn
          ? "0 0 8px 2px hsl(var(--primary)), 0 0 4px 1px hsl(var(--primary))"
          : "none";
        lastIndicatorOn = indicatorIsOn;
      }
    });

    return unsubscribe;
  }, [stepIndex, variation, playbackVariation, isAccentBeat, isIntroPlaying]);

  return (
    <div
      ref={indicatorRef}
      className={cn(
        baseClassName,
        "bg-sequencer-indicator-regular",
        isAccentBeat && "bg-sequencer-indicator-accent",
      )}
    />
  );
};
