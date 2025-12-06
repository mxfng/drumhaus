import { useEffect, useRef } from "react";

import { subscribeToStepUpdates } from "@/features/sequencer/lib/stepTicker";
import { cn } from "@/shared/lib/utils";
import { useLightNode, useLightRig } from "@/shared/lightshow";

interface SequencerStepIndicatorProps {
  index: number;
  isInCurrentVariation?: boolean;
}

export const SequencerStepIndicator: React.FC<SequencerStepIndicatorProps> = ({
  index,
  isInCurrentVariation = false,
}) => {
  // --- Lightshow ---
  const indicatorRef = useRef<HTMLDivElement>(null);

  useLightNode(indicatorRef, {
    group: "sequencer-indicator",
    weight: 0.4,
  });

  const { isIntroPlaying } = useLightRig();

  // --- Computed styles ---

  const isAccentBeat = index % 4 === 0;
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
      const isCurrentStep = currentStep === index;

      const indicatorIsOn =
        isPlaying &&
        isCurrentStep &&
        (isInCurrentVariation || (isAccentBeat && !isInCurrentVariation));

      setState(indicatorIsOn);
    });

    setState(false);

    return unsubscribe;
  }, [
    index,
    isInCurrentVariation,
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
