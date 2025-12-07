import { InlineMeta } from "@/features/preset/types/meta";
import { ClipboardContent, CopySource } from "../types/clipboard";
import { Pattern, StepSequence } from "../types/pattern";
import { VariationId } from "../types/sequencer";

/**
 * Deep clone a StepSequence.
 * Copies the entire groove: triggers, velocities, ratchets, flams, and nudge.
 */
export function cloneStepSequence(seq: StepSequence): StepSequence {
  return {
    triggers: [...seq.triggers],
    velocities: [...seq.velocities],
    timingNudge: seq.timingNudge,
    ratchets: [...seq.ratchets],
    flams: [...seq.flams],
  };
}

/**
 * Create clipboard content from one instrument's groove.
 */
export function createInstrumentClipboard(
  pattern: Pattern,
  voiceIndex: number,
  variationId: VariationId,
  meta: InlineMeta,
): { clipboard: ClipboardContent; source: CopySource } {
  return {
    clipboard: {
      type: "instrument",
      data: cloneStepSequence(
        pattern.voices[voiceIndex].variations[variationId],
      ),
      meta,
    },
    source: { type: "instrument", voiceIndex, variationId },
  };
}

/**
 * Create clipboard content from an entire variation's groove.
 * Includes all 8 instruments + the accent pattern.
 */
export function createVariationClipboard(
  pattern: Pattern,
  variationId: VariationId,
): { clipboard: ClipboardContent; source: CopySource } {
  return {
    clipboard: {
      type: "variation",
      data: {
        voices: pattern.voices.map((voice) =>
          cloneStepSequence(voice.variations[variationId]),
        ),
        accent: [...pattern.variationMetadata[variationId].accent],
      },
    },
    source: { type: "variation", variationId },
  };
}

/**
 * Check if a paste target is the exact same location as the copy source.
 * Used to prevent pasting to the same location (no-op) and for UI dimming.
 */
export function isSameAsSource(
  source: CopySource,
  targetType: "instrument" | "variation",
  targetVoiceIndex: number | null,
  targetVariationId: VariationId,
): boolean {
  if (source.type === "variation" && targetType === "variation") {
    return source.variationId === targetVariationId;
  }
  if (source.type === "instrument" && targetType === "instrument") {
    return (
      source.voiceIndex === targetVoiceIndex &&
      source.variationId === targetVariationId
    );
  }
  return false;
}

export function applyInstrumentClipboard(
  pattern: Pattern,
  clipboard: ClipboardContent | null,
  voiceIndex: number,
  variationId: VariationId,
): boolean {
  if (clipboard?.type !== "instrument") return false;

  pattern.voices[voiceIndex].variations[variationId] = cloneStepSequence(
    clipboard.data,
  );
  return true;
}

export function applyVariationClipboard(
  pattern: Pattern,
  clipboard: ClipboardContent | null,
  variationId: VariationId,
): boolean {
  if (clipboard?.type !== "variation") return false;

  clipboard.data.voices.forEach((seq, idx) => {
    pattern.voices[idx].variations[variationId] = cloneStepSequence(seq);
  });
  pattern.variationMetadata[variationId].accent = [...clipboard.data.accent];
  return true;
}
