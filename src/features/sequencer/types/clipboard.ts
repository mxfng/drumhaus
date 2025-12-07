import { InlineMeta } from "@/features/preset/types/meta";
import { StepSequence } from "./pattern";
import { VariationId } from "./sequencer";

/**
 * Clipboard content - the copied groove data.
 *
 * "Copy the groove, not the lane" - we always copy complete patterns:
 * - Instrument: Full StepSequence (triggers, velocities, ratchets, flams, nudge)
 * - Variation: All 8 instruments + accent pattern
 */
export type ClipboardContent =
  | {
      type: "instrument";
      /** Full groove for one voice */
      data: StepSequence;
      /** Copy-time metadata so UI can render names without re-querying stores */
      meta: InlineMeta;
    }
  | {
      type: "variation";
      data: {
        /** All 8 instruments' full grooves */
        voices: StepSequence[];
        /** Variation-level accent pattern */
        accent: boolean[];
      };
    };

/**
 * Reference to where the copy originated.
 * Used for UI feedback and preventing paste to same location.
 */
export type CopySource =
  | { type: "instrument"; voiceIndex: number; variationId: VariationId }
  | { type: "variation"; variationId: VariationId };
