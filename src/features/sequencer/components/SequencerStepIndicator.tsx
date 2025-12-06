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

  useLightNode(indicatorRef, {
    group: "sequencer-indicator",
    weight: 0.4,
  });

  const { isIntroPlaying } = useLightRig();

  // --- Computed styles ---

  const isAccentBeat = stepIndex % 4 === 0;
  const idleColorClass = isAccentBeat
    ? "bg-sequencer-indicator-accent"
    : "bg-sequencer-indicator-regular";

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
    const setState = (indicatorIsOn: boolean) => {
      if (indicatorIsOn === lastIndicatorOn) return;
      el.classList.toggle("bg-primary", indicatorIsOn);
      el.classList.toggle(idleColorClass, !indicatorIsOn);
      el.style.boxShadow = indicatorIsOn
        ? `0 0 4px var(--color-primary-shadow)`
        : "none";
      lastIndicatorOn = indicatorIsOn;
    };

    const unsubscribe = subscribeToStepUpdates(({ currentStep, isPlaying }) => {
      const isCurrentStep = currentStep === stepIndex;
      const inSameVariation = playbackVariation === variation;

      const indicatorIsOn =
        isPlaying &&
        isCurrentStep &&
        (inSameVariation || (isAccentBeat && !inSameVariation));

      setState(indicatorIsOn);
    });

    setState(false);

    return unsubscribe;
  }, [
    stepIndex,
    variation,
    playbackVariation,
    isAccentBeat,
    isIntroPlaying,
    idleColorClass,
  ]);

  return (
    <div
      ref={indicatorRef}
      className={cn(
        "mb-4 h-1 w-full rounded-full transition-none",
        idleColorClass,
      )}
    />
  );
};
