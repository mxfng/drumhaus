import type { PatternChain } from "@/core/audio/engine/pattern-types";
import { Pattern } from "./pattern";

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
// Chain types are owned by the audio engine (core/audio/engine/pattern-types.ts);
// re-exported here to preserve the historical feature-layer import path.
export type {
  VariationId,
  PatternChainStep,
  PatternChain,
} from "@/core/audio/engine/pattern-types";
export type { VariationCycle, SequencerData };
