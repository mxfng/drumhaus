import { useEffect, useState } from "react";
import { getTransport, Ticks } from "tone";

import { SEQUENCE_SUBDIVISION, STEP_COUNT } from "@/lib/audio/engine/constants";
import { useTransportStore } from "@/stores/useTransportStore";

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

/**
 * Hook to track if a given step is currently playing
 */
export const useCurrentStep = (
  stepIndex: number,
  variation?: number,
  playbackVariation?: number,
) => {
  const [isCurrentStep, setIsCurrentStep] = useState(false);

  useEffect(() => {
    if (variation === undefined || playbackVariation === undefined) {
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

      setIsCurrentStep(isThisStepPlaying);
      animationId = requestAnimationFrame(updateCurrentStep);
    };

    animationId = requestAnimationFrame(updateCurrentStep);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stepIndex, variation, playbackVariation]);

  return isCurrentStep;
};

/**
 * Hook to get the current step index from transport
 * Useful for components that need to track all steps
 */
export const useCurrentStepIndex = () => {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);

  useEffect(() => {
    let animationId: number;

    const updateCurrentStepIndex = () => {
      const { isPlaying } = useTransportStore.getState();
      const stepIndex = isPlaying ? getCurrentStepFromTransport() : -1;
      setCurrentStepIndex(stepIndex);
      animationId = requestAnimationFrame(updateCurrentStepIndex);
    };

    animationId = requestAnimationFrame(updateCurrentStepIndex);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return currentStepIndex;
};
