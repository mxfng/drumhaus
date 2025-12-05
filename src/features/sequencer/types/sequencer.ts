import { Pattern } from "./pattern";

export type VariationId = 0 | 1 | 2 | 3;

export const VARIATION_LABELS: readonly ["A", "B", "C", "D"] = [
  "A",
  "B",
  "C",
  "D",
];

export type VariationCycle = "A" | "B" | "AB" | "AAAB"; // Legacy-only

export type PatternChainStep = {
  variation: VariationId;
  repeats: number;
};

export type PatternChain = {
  steps: PatternChainStep[];
};

export interface SequencerData {
  pattern: Pattern;
  /**
   * Legacy variation cycle (pre-chain). Only used for migration.
   */
  variationCycle?: VariationCycle;
  chain: PatternChain;
  chainEnabled: boolean;
}
