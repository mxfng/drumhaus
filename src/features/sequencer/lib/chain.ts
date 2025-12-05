import { PatternChain, VariationCycle, VariationId } from "../types/sequencer";

export const MIN_CHAIN_REPEAT = 1;
export const MAX_CHAIN_REPEAT = 8;
export const MAX_CHAIN_STEPS = 8;
export const DEFAULT_CHAIN: PatternChain = {
  steps: [{ variation: 0, repeats: 1 }],
};

export function clampVariationId(variation: number): VariationId {
  if (variation < 0) return 0;
  if (variation > 3) return 3;
  return variation as VariationId;
}

export function sanitizeChain(
  chain?: PatternChain,
  options?: { allowEmpty?: boolean },
): PatternChain {
  const allowEmpty = options?.allowEmpty ?? false;
  if (!chain || !Array.isArray(chain.steps)) {
    return allowEmpty ? { steps: [] } : DEFAULT_CHAIN;
  }

  const steps = chain.steps
    .slice(0, MAX_CHAIN_STEPS)
    .map((step) => ({
      variation: clampVariationId(step.variation),
      repeats: Math.min(
        MAX_CHAIN_REPEAT,
        Math.max(MIN_CHAIN_REPEAT, step.repeats ?? 1),
      ),
    }))
    .filter((step) => step.repeats > 0);

  if (steps.length === 0) {
    return allowEmpty ? { steps: [] } : DEFAULT_CHAIN;
  }

  return { steps };
}

export function legacyCycleToChain(
  variationCycle: VariationCycle | undefined,
  fallbackVariation: number,
): {
  chain: PatternChain;
  chainEnabled: boolean;
  variation: VariationId;
} {
  const baseVariation = clampVariationId(fallbackVariation);

  switch (variationCycle) {
    case "B":
      return {
        chain: { steps: [{ variation: 1, repeats: 1 }] },
        chainEnabled: false,
        variation: 1,
      };
    case "AB":
      return {
        chain: {
          steps: [
            { variation: 0, repeats: 1 },
            { variation: 1, repeats: 1 },
          ],
        },
        chainEnabled: true,
        variation: baseVariation,
      };
    case "AAAB":
      return {
        chain: {
          steps: [
            { variation: 0, repeats: 3 },
            { variation: 1, repeats: 1 },
          ],
        },
        chainEnabled: true,
        variation: baseVariation,
      };
    case "A":
    default:
      return {
        chain: { steps: [{ variation: baseVariation, repeats: 1 }] },
        chainEnabled: false,
        variation: baseVariation,
      };
  }
}
