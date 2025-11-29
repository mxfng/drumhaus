import { useState } from "react";

import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { STEP_COUNT } from "@/lib/audio/engine/constants";

export const useSequencerControl = () => {
  // Get state from Pattern Store
  const variation = usePatternStore((state) => state.variation);
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const pattern = usePatternStore((state) => state.pattern);
  const currentTriggers = usePatternStore(
    (state) =>
      state.pattern[state.voiceIndex].variations[state.variation].triggers,
  );

  // Get actions from store
  const setVariation = usePatternStore((state) => state.setVariation);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);
  const updateSequence = usePatternStore((state) => state.updatePattern);
  const clearSequence = usePatternStore((state) => state.clearPattern);

  // Local clipboard state
  const [copiedTriggers, setCopiedTriggers] = useState<boolean[] | undefined>();
  const [copiedVelocities, setCopiedVelocities] = useState<
    number[] | undefined
  >();

  const copySequence = () => {
    setCopiedTriggers(currentTriggers);
    setCopiedVelocities(pattern[voiceIndex].variations[variation].velocities);
  };

  const pasteSequence = () => {
    if (copiedTriggers && copiedVelocities) {
      updateSequence(voiceIndex, variation, copiedTriggers, copiedVelocities);
    }
  };

  const handleClearSequence = () => {
    clearSequence(voiceIndex, variation);
  };

  const handleRandomSequence = () => {
    const randomTriggers: boolean[] = Array.from(
      { length: STEP_COUNT },
      () => Math.random() < 0.5,
    );
    const randomVelocities: number[] = Array.from({ length: STEP_COUNT }, () =>
      Math.random(),
    );
    updateSequence(voiceIndex, variation, randomTriggers, randomVelocities);
  };

  return {
    // State
    variation,
    variationCycle,
    voiceIndex,
    hasCopiedSequence: !!(copiedTriggers && copiedVelocities),

    // Actions
    setVariation,
    setVariationCycle,
    copySequence,
    pasteSequence,
    clearSequence: handleClearSequence,
    randomSequence: handleRandomSequence,
  };
};
