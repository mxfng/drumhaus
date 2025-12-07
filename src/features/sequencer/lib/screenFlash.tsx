import { InlineMeta } from "@/features/preset/types/meta";
import { VariationBadge } from "@/features/sequencer/components/VariationBadge";
import { VariationId } from "@/features/sequencer/types/sequencer";
import { ScreenFlashPayload } from "@/shared/store/useScreenFlashStore";

type InstrumentPasteFlashOptions = {
  sourceMeta?: InlineMeta;
  targetMeta?: InlineMeta;
  sourceVariation?: VariationId;
  targetVariation: VariationId;
};

export function buildInstrumentPasteFlash({
  sourceMeta,
  targetMeta,
  sourceVariation,
  targetVariation,
}: InstrumentPasteFlashOptions): ScreenFlashPayload {
  return {
    message: "pasted",
    subtext: (
      <div>
        <span className="inline-flex items-center gap-1">
          {sourceMeta?.name ?? "instrument"}{" "}
          <VariationBadge variation={sourceVariation ?? 0} />
        </span>
        {targetMeta && (
          <>
            <span className="text-foreground-muted text-xs"> → </span>
            <span className="inline-flex items-center gap-1">
              {targetMeta.name} <VariationBadge variation={targetVariation} />
            </span>
          </>
        )}
      </div>
    ),
    tone: "success",
    icon: "paste",
  };
}

export function buildVariationPasteFlash(
  source: VariationId,
  target: VariationId,
): ScreenFlashPayload {
  return {
    message: "pasted",
    subtext: (
      <span className="inline-flex items-center gap-1">
        Variation <VariationBadge variation={source} />
        <span className="text-foreground-muted text-xs"> → </span>
        <span className="inline-flex items-center gap-1">
          Variation <VariationBadge variation={target} />
        </span>
      </span>
    ),
    tone: "success",
    icon: "paste",
  };
}
