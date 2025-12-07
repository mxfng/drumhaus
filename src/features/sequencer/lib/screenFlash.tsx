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

export function buildInstrumentCopyFlash(
  meta: InlineMeta,
  variation: VariationId,
): ScreenFlashPayload {
  return {
    message: "copied",
    subtext: (
      <span className="inline-flex items-center gap-1">
        {meta.name} <VariationBadge variation={variation} />
      </span>
    ),
    tone: "success",
    icon: "paste",
  };
}

export function buildVariationCopyFlash(
  variation: VariationId,
): ScreenFlashPayload {
  return {
    message: "copied",
    subtext: (
      <span className="inline-flex items-center gap-1">
        Variation <VariationBadge variation={variation} />
      </span>
    ),
    tone: "success",
    icon: "paste",
  };
}

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

type InstrumentClearOptions = {
  meta: InlineMeta;
  variation?: VariationId;
};

export function buildInstrumentClearFlash({
  meta,
  variation,
}: InstrumentClearOptions): ScreenFlashPayload {
  return {
    message: "cleared",
    subtext: (
      <span className="inline-flex items-center gap-1">
        {meta?.name ?? "instrument"}{" "}
        <VariationBadge variation={variation ?? 0} />
      </span>
    ),
    tone: "warning",
    icon: "eraser",
  };
}

export function buildVariationClearFlash(
  variation: VariationId,
): ScreenFlashPayload {
  return {
    message: "cleared",
    subtext: (
      <span className="inline-flex items-center gap-1">
        Variation <VariationBadge variation={variation} />
      </span>
    ),
    tone: "warning",
    icon: "eraser",
  };
}
