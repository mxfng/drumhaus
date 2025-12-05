import { useState } from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";

/**
 * @deprecated Will be building out an enhanced control system for new copy paste clear features.
 */
export const useSequencerControl = () => {
  // Get state from Pattern Store
  const variation = usePatternStore((state) => state.variation);
  const mode = usePatternStore((state) => state.mode);
  const pattern = usePatternStore((state) => state.pattern);

  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;
  const currentTriggers = usePatternStore((state) => {
    const vi = state.mode.type === "voice" ? state.mode.voiceIndex : 0;
    return state.pattern.voices[vi].variations[state.variation].triggers;
  });

  // Get actions from store
  const setVariation = usePatternStore((state) => state.setVariation);
  const updateSequence = usePatternStore((state) => state.updatePattern);
  const clearSequence = usePatternStore((state) => state.clearPattern);

  // Local clipboard state
  const [copiedTriggers, setCopiedTriggers] = useState<boolean[] | undefined>();
  const [copiedVelocities, setCopiedVelocities] = useState<
    number[] | undefined
  >();

  const copySequence = () => {
    setCopiedTriggers(currentTriggers);
    setCopiedVelocities(
      pattern.voices[voiceIndex].variations[variation].velocities,
    );
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
    voiceIndex,
    hasCopiedSequence: !!(copiedTriggers && copiedVelocities),

    // Actions
    setVariation,
    copySequence,
    pasteSequence,
    clearSequence: handleClearSequence,
    randomSequence: handleRandomSequence,
  };
};
