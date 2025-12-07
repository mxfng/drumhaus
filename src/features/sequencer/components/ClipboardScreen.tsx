import React from "react";
import { ArrowRight, Clipboard } from "lucide-react";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { VARIATION_LABELS } from "@/features/sequencer/types/sequencer";
import { ScreenBar } from "@/layout/ScreenBar";

/**
 * Screen display for copy/paste modes.
 *
 * - Copy mode: Prompts user to select an instrument or variation to copy
 * - Paste mode: Shows what's on the clipboard and prompts for destination
 */
export const ClipboardScreen: React.FC = () => {
  const mode = usePatternStore((state) => state.mode);
  const clipboard = usePatternStore((state) => state.clipboard);
  const copySource = usePatternStore((state) => state.copySource);
  const instruments = useInstrumentsStore((state) => state.instruments);

  const isCopyMode = mode.type === "copy";
  const isPasteMode = mode.type === "paste";

  if (!isCopyMode && !isPasteMode) return null;

  // Copy mode: prompt user to select source
  if (isCopyMode) {
    return (
      <div className="bg-screen flex h-full flex-col gap-1 pt-1">
        <div className="flex flex-1 items-center justify-center gap-2 px-5">
          <Clipboard size={14} className="text-foreground-muted" />
          <span className="text-[10px] leading-3 normal-case">
            Select an <b>instrument</b> or <b>variation</b> to copy.
          </span>
        </div>
        <ScreenBar>
          <p>copy mode</p>
        </ScreenBar>
      </div>
    );
  }

  // Paste mode: show clipboard contents
  if (!clipboard || !copySource) return null;

  const sourceLabel =
    copySource.type === "variation"
      ? `Variation ${VARIATION_LABELS[copySource.variationId]}`
      : `${instruments[copySource.voiceIndex].meta.name} (${VARIATION_LABELS[copySource.variationId]})`;

  const clipboardTypeLabel =
    clipboard.type === "variation"
      ? "all instruments + accents"
      : "full groove";

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center justify-between gap-2 px-5">
        <div className="flex items-center gap-2">
          <Clipboard size={14} className="text-primary" />
          <div className="flex flex-col">
            <span className="text-xs font-medium">{sourceLabel}</span>
            <span className="text-foreground-muted text-[9px]">
              {clipboardTypeLabel}
            </span>
          </div>
        </div>
        <div className="text-foreground-muted flex items-center gap-1">
          <ArrowRight size={12} />
          <span className="text-[10px]">select target</span>
        </div>
      </div>
      <ScreenBar className="flex flex-row justify-between">
        <p>paste mode</p>
        <p className="text-xs">
          {clipboard.type === "variation" ? "variation" : "instrument"}
        </p>
      </ScreenBar>
    </div>
  );
};
