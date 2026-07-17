/**
 * Legacy-read island: the one-time conversion of a v1 file's pre-chain
 * `variationCycle` ("A" / "B" / "AB" / "AAAB") into a canonical pattern chain
 * (docs/preset-versioning.md section 4). Only ever reads legacy data: the v1
 * migration ladder (migrate-v1.ts) and the localStorage adopters
 * (session/legacy-adopter.ts) call it, and nothing born after the chain flip
 * carries a `variationCycle`. Extracted out of features/sequencer/lib/chain.ts
 * so it sits inside the island rather than beside the live `appendChainDraftStep`.
 */

import {
  clampVariationId,
  PatternChain,
  VariationId,
} from "@/core/audio/engine/pattern-types";
import type { LegacyVariationCycle } from "@/features/preset/types/legacy-v1";

function legacyCycleToChain(
  variationCycle: LegacyVariationCycle | undefined,
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

export { legacyCycleToChain };
