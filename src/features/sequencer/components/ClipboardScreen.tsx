import { Clipboard } from "lucide-react";

import { MiniStepGrid } from "@/features/groove/components/MiniStepGrid";
import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { ClipboardVariationPreview } from "@/features/sequencer/components/ClipboardVariationPreview";
import { VariationBadge } from "@/features/sequencer/components/VariationBadge";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
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
        <div className="flex flex-1 items-center justify-start gap-2 px-5">
          <Clipboard size={20} className="text-foreground-muted" />
          <span className="-my-1 text-[10px] leading-3 normal-case">
            Copy mode is enabled
            <br />
            Select an instrument or variation to copy
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

  const instrumentPattern =
    clipboard.type === "instrument" ? clipboard.data.triggers : null;
  const variationPreview =
    clipboard.type === "variation"
      ? { voices: clipboard.data.voices, accent: clipboard.data.accent }
      : null;

  const footerDetail =
    copySource.type === "variation" ? (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs">
          Variation <VariationBadge variation={copySource.variationId} />
        </span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <span className="text-xs">
          {instruments[copySource.voiceIndex].meta.name}
        </span>
        <VariationBadge variation={copySource.variationId} />
      </div>
    );

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center justify-between gap-2 px-5">
        <div className="-my-2 flex w-full items-center gap-3">
          {instrumentPattern && (
            <div className="flex-1">
              <MiniStepGrid steps={instrumentPattern} />
            </div>
          )}

          {variationPreview && (
            <div className="min-w-0 flex-1">
              <ClipboardVariationPreview voices={variationPreview.voices} />
            </div>
          )}
        </div>
      </div>
      <ScreenBar className="flex flex-row justify-between">
        <p>paste mode</p>
        <div className="text-xs">{footerDetail}</div>
      </ScreenBar>
    </div>
  );
};
