import { InstrumentData } from "@/core/audio/engine/instrument/types";
import { InlineMeta } from "@/features/preset/types/meta";
import { createInstrumentClipboard } from "@/features/sequencer/lib/clipboard";
import {
  buildInstrumentPasteFlash,
  buildVariationPasteFlash,
} from "@/features/sequencer/lib/screenFlash";
import {
  ClipboardContent,
  CopySource,
} from "@/features/sequencer/types/clipboard";
import { Pattern } from "@/features/sequencer/types/pattern";
import { VariationId } from "@/features/sequencer/types/sequencer";
import { ScreenFlashPayload } from "@/shared/store/useScreenFlashStore";

export function resolveInstrumentMeta(
  instruments: InstrumentData[],
  voiceIndex: number,
): InlineMeta {
  return (
    instruments[voiceIndex]?.meta ?? {
      id: `instrument-${voiceIndex}`,
      name: `Instrument ${voiceIndex + 1}`,
    }
  );
}

export function buildInstrumentClipboardState(
  pattern: Pattern,
  voiceIndex: number,
  variationId: VariationId,
  instruments: InstrumentData[],
): { clipboard: ClipboardContent; source: CopySource } {
  const meta = resolveInstrumentMeta(instruments, voiceIndex);
  return createInstrumentClipboard(pattern, voiceIndex, variationId, meta);
}

type InstrumentPasteFlashContext = {
  clipboard: ClipboardContent | null;
  copySource: CopySource | null;
  targetVoiceIndex: number;
  targetVariation: VariationId;
  instruments: InstrumentData[];
};

export function buildInstrumentPasteFlashFromContext({
  clipboard,
  copySource,
  targetVoiceIndex,
  targetVariation,
  instruments,
}: InstrumentPasteFlashContext): ScreenFlashPayload | null {
  if (clipboard?.type !== "instrument") return null;

  const targetMeta = resolveInstrumentMeta(instruments, targetVoiceIndex);
  const sourceVariation =
    copySource?.type === "instrument" ? copySource.variationId : undefined;

  return buildInstrumentPasteFlash({
    sourceMeta: clipboard.meta,
    targetMeta,
    sourceVariation,
    targetVariation,
  });
}

export function buildVariationPasteFlashFromContext(
  source: VariationId | undefined,
  target: VariationId,
): ScreenFlashPayload {
  return buildVariationPasteFlash(source ?? 0, target);
}
