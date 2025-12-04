import { clampVariationId } from "@/features/sequencer/lib/chain";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import {
  PatternChain,
  VariationId,
} from "@/features/sequencer/types/sequencer";
import { SEQUENCE_EVENTS } from "../constants";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type ChainPlaybackState = {
  stepIndex: number;
  repeatsRemaining: number;
};

// -----------------------------------------------------------------------------
// Step Boundaries
// -----------------------------------------------------------------------------

/**
 * Checks if step is first or last in the sequence.
 */
export function getStepBoundaries(step: number): {
  isFirstStep: boolean;
  isLastStep: boolean;
} {
  return {
    isFirstStep: step === SEQUENCE_EVENTS[0],
    isLastStep: step === SEQUENCE_EVENTS[SEQUENCE_EVENTS.length - 1],
  };
}

// -----------------------------------------------------------------------------
// Variation & Chain Management
// -----------------------------------------------------------------------------

/**
 * Updates the current playback variation and syncs with store.
 */
export function updatePlaybackVariation(
  currentVariation: { current: number },
  nextVariation: number,
): void {
  const clamped = clampVariationId(nextVariation);
  currentVariation.current = clamped;

  const playbackVariation = usePatternStore.getState().playbackVariation;
  if (playbackVariation !== clamped) {
    usePatternStore.getState().setPlaybackVariation(clamped);
  }
}

/**
 * Updates variation at the start of a bar.
 * Handles both chain mode and regular variation switching.
 */
export function updateVariationForBarStart(
  chainEnabled: boolean,
  chain: PatternChain,
  chainState: ChainPlaybackState,
  currentVariation: { current: number },
  fallbackVariation: VariationId,
): void {
  if (!chainEnabled || chain.steps.length === 0) {
    const latestVariation = clampVariationId(
      usePatternStore.getState().variation ?? fallbackVariation,
    );
    updatePlaybackVariation(currentVariation, latestVariation);
    return;
  }

  if (chainState.stepIndex >= chain.steps.length) {
    chainState.stepIndex = 0;
    chainState.repeatsRemaining = chain.steps[0].repeats;
  }

  const currentStep = chain.steps[chainState.stepIndex];
  updatePlaybackVariation(currentVariation, currentStep.variation);
}

/**
 * Advances the chain state at the end of a bar.
 * Decrements repeats and moves to next chain step when needed.
 */
export function advanceChainAtEndOfBar(
  chainEnabled: boolean,
  chain: PatternChain,
  chainState: ChainPlaybackState,
): void {
  if (!chainEnabled || chain.steps.length === 0) return;

  chainState.repeatsRemaining -= 1;

  if (chainState.repeatsRemaining <= 0) {
    chainState.stepIndex =
      (chainState.stepIndex + 1) % Math.max(chain.steps.length, 1);
    chainState.repeatsRemaining =
      chain.steps[chainState.stepIndex]?.repeats ?? 1;
  }
}
