import {
  clampVariationId,
  MAX_CHAIN_REPEAT,
  MAX_CHAIN_STEPS,
  MIN_CHAIN_REPEAT,
  PatternChain,
  sanitizeChain,
  VariationId,
} from "@/core/audio/engine/pattern-types";

function appendChainDraftStep(
  chainDraft: PatternChain,
  variation: VariationId,
): PatternChain {
  const chain = sanitizeChain(chainDraft, { allowEmpty: true });
  const steps = [...chain.steps];
  const lastStep = steps[steps.length - 1];
  const variationId = clampVariationId(variation);

  const totalBars = steps.reduce((sum, step) => sum + step.repeats, 0);

  if (
    lastStep &&
    lastStep.variation === variationId &&
    lastStep.repeats < MAX_CHAIN_REPEAT &&
    totalBars < MAX_CHAIN_STEPS
  ) {
    lastStep.repeats += 1;
    steps[steps.length - 1] = lastStep;
  } else if (steps.length < MAX_CHAIN_STEPS && totalBars < MAX_CHAIN_STEPS) {
    steps.push({ variation: variationId, repeats: MIN_CHAIN_REPEAT });
  }

  return sanitizeChain(
    {
      steps,
    },
    { allowEmpty: true },
  );
}

export { appendChainDraftStep };
