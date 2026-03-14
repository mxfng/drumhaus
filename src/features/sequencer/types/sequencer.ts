import { Pattern } from "./pattern";

type VariationId = 0 | 1 | 2 | 3;

const VARIATION_LABELS: readonly ["A", "B", "C", "D"] = ["A", "B", "C", "D"];

type VariationCycle = "A" | "B" | "AB" | "AAAB"; // Legacy-only

type PatternChainStep = {
  variation: VariationId;
  repeats: number;
};

type PatternChain = {
  steps: PatternChainStep[];
};

interface SequencerData {
  pattern: Pattern;
  /**
   * Legacy variation cycle (pre-chain). Only used for migration.
   */
  variationCycle?: VariationCycle;
  chain: PatternChain;
  chainEnabled: boolean;
}

export { VARIATION_LABELS };
export type {
  VariationId,
  VariationCycle,
  PatternChainStep,
  PatternChain,
  SequencerData,
};
