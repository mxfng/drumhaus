import { isSameAsSource } from "@/features/sequencer/lib/clipboard";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import {
  copiedItemHighlight,
  interactableHighlight,
} from "@/shared/lib/interactableHighlight";
import { cn } from "@/shared/lib/utils";
import { InstrumentRuntime } from "../../../core/audio/engine/instrument/types";
import { useInstrumentsStore } from "../store/useInstrumentsStore";
import { InstrumentHeader } from "./InstrumentHeader";
import { InstrumentParamsControl } from "./InstrumentParamsControl";

type InstrumentControlParams = {
  runtime?: InstrumentRuntime;
  color?: string;
  index: number;
  waveformWidth?: number;
};

export const InstrumentControl: React.FC<InstrumentControlParams> = ({
  runtime,
  index,
  color = "currentColor",
  waveformWidth,
}) => {
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );

  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);
  const clipboard = usePatternStore((state) => state.clipboard);
  const copySource = usePatternStore((state) => state.copySource);

  const isSelectedAndActive =
    (mode.type === "voice" ||
      mode.type === "ratchet" ||
      mode.type === "flam") &&
    mode.voiceIndex === index;

  const isCopyMode = mode.type === "copy";
  const isPasteMode = mode.type === "paste";
  const isClearMode = mode.type === "clear";

  // Check if this instrument is the copy source (for dimming in paste mode)
  const isSource =
    isPasteMode &&
    copySource !== null &&
    clipboard?.type === "instrument" &&
    isSameAsSource(copySource, "instrument", index, variation);

  // Highlight instruments in copy mode, or in paste mode with instrument clipboard
  const shouldHighlight =
    isCopyMode ||
    isClearMode ||
    (isPasteMode && clipboard?.type === "instrument" && !isSource);

  const shouldShowCopiedHighlight = isSource;
  const disableChildInteractions = shouldHighlight || shouldShowCopiedHighlight;

  // Don't show selected state during copy/paste modes
  const showSelectedState =
    isSelectedAndActive && !isCopyMode && !isPasteMode && !isClearMode;

  return (
    <div
      className={cn(
        "group flex h-full w-full flex-col rounded-2xl border border-transparent",
        {
          "cursor-pointer": runtime,
          "cursor-default": !runtime,
        },
        showSelectedState && "border-primary/60 bg-primary/5",
        interactableHighlight(shouldHighlight),
        copiedItemHighlight(shouldShowCopiedHighlight),
        disableChildInteractions && "bg-surface",
      )}
      key={`Instrument-${instrumentMeta.id}-${index}`}
    >
      <div className="mb-2">
        <InstrumentHeader
          index={index}
          color={color}
          waveformWidth={waveformWidth}
          runtime={runtime}
        />
      </div>

      <div className="mb-2">
        <InstrumentParamsControl index={index} runtime={runtime} />
      </div>
    </div>
  );
};
