import { SEQUENCE_EVENTS } from "../constants";
import { clampVariationId, PatternChain, VariationId } from "../pattern-types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ChainPlaybackState = {
  stepIndex: number;
  repeatsRemaining: number;
};

// -----------------------------------------------------------------------------
// Step Boundaries
// -----------------------------------------------------------------------------

/**
 * Checks if step is first or last in the sequence.
 */
function getStepBoundaries(step: number): {
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
 * Resolves which variation should play for the bar that is starting.
 *
 * In chain mode this reads (and wrap-fixes) the chain playback state;
 * otherwise the latest pushed variation wins. Pure aside from the chainState
 * wrap repair: the caller owns storing the result and notifying listeners.
 */
function variationForBarStart(
  chainEnabled: boolean,
  chain: PatternChain,
  chainState: ChainPlaybackState,
  latestVariation: VariationId,
): VariationId {
  if (!chainEnabled || chain.steps.length === 0) {
    return clampVariationId(latestVariation);
  }

  if (chainState.stepIndex >= chain.steps.length) {
    chainState.stepIndex = 0;
    chainState.repeatsRemaining = chain.steps[0].repeats;
  }

  return clampVariationId(chain.steps[chainState.stepIndex].variation);
}

/**
 * Advances the chain state at the end of a bar.
 * Decrements repeats and moves to next chain step when needed.
 */
function advanceChainAtEndOfBar(
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

export { getStepBoundaries, variationForBarStart, advanceChainAtEndOfBar };
export type { ChainPlaybackState };
