import { clearStepSequence } from "@/features/sequencer/lib/patternMutations";
import { Pattern } from "@/features/sequencer/types/pattern";
import { VariationId } from "@/features/sequencer/types/sequencer";

/** Clear a single instrument's pattern for a specific variation. Mutates the pattern in place. */
export function clearInstrumentVariation(
  pattern: Pattern,
  voiceIndex: number,
  variation: VariationId,
): void {
  clearStepSequence(pattern, voiceIndex, variation);
}

/** Clear all instruments plus accent metadata for a variation. Mutates the pattern in place. */
export function clearVariationPatterns(
  pattern: Pattern,
  variation: VariationId,
): void {
  pattern.voices.forEach((_, voiceIndex) => {
    clearStepSequence(pattern, voiceIndex, variation);
  });
  pattern.variationMetadata[variation].accent = pattern.variationMetadata[
    variation
  ].accent.map(() => false);
}
