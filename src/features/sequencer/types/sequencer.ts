import type { Pattern, PatternChain } from "@/core/audio/engine/pattern-types";

const VARIATION_LABELS: readonly ["A", "B", "C", "D"] = ["A", "B", "C", "D"];

type VariationCycle = "A" | "B" | "AB" | "AAAB"; // Legacy-only

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
export type { VariationCycle, SequencerData };
