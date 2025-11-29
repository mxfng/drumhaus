import { useCallback, useState } from "react";

import { playInstrumentSample } from "@/core/audio/engine";
import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/shared/ui";
import { INSTRUMENT_COLORS } from "../lib/colors";
import { useInstrumentsStore } from "../store/useInstrumentsStore";
import { InstrumentHeader } from "./InstrumentHeader";
import { InstrumentParamsControl } from "./InstrumentParamsControl";
import { InstrumentMode } from "./MobileInstrumentContextMenu";

interface MobileInstrumentGridProps {
  mode: InstrumentMode;
}

export const MobileInstrumentGrid: React.FC<MobileInstrumentGridProps> = ({
  mode,
}) => {
  const { instrumentRuntimes, instrumentRuntimesVersion } = useDrumhaus();

  const instruments = useInstrumentsStore((state) => state.instruments);
  const [editingVoiceIndex, setEditingVoiceIndex] = useState<number | null>(
    null,
  );

  const handleInstrumentClick = useCallback(
    (voiceIndex: number) => {
      const runtime = instrumentRuntimes.current[voiceIndex];

      if (mode === "trigger" && runtime) {
        // Trigger mode: play the sample
        const pitch = instruments[voiceIndex].params.pitch;
        const release = instruments[voiceIndex].params.release;
        playInstrumentSample(runtime, pitch, release);
      } else if (mode === "edit") {
        // Edit mode: open params dialog
        setEditingVoiceIndex(voiceIndex);
      }
    },
    [mode, instrumentRuntimes, instruments],
  );

  return (
    <>
      <div className="grid h-full w-full grid-cols-2 grid-rows-4 gap-px">
        {Array.from({ length: 8 }).map((_, index: number) => {
          // Reverse row order: bottom row = 1,2 ... top row = 7,8
          const row = Math.floor(index / 2); // Which row (0-3)
          const col = index % 2; // Which column (0-1)
          const flippedRow = 3 - row; // Flip row order
          const voiceIndex = flippedRow * 2 + col; // Calculate voiceIndex from flipped position
          const runtime = instrumentRuntimes.current[voiceIndex];

          return (
            <div
              key={`instrument-${voiceIndex}`}
              className="flex flex-col items-center justify-center pb-2 transition-colors"
              style={{
                borderLeftColor: INSTRUMENT_COLORS[voiceIndex],
                borderLeftWidth: "4px",
              }}
            >
              <InstrumentHeader
                index={voiceIndex}
                color={INSTRUMENT_COLORS[voiceIndex]}
                runtime={runtime}
                className="flex-col items-start"
                onInteract={() => handleInstrumentClick(voiceIndex)}
              />
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      {editingVoiceIndex !== null && (
        <Dialog
          open={editingVoiceIndex !== null}
          onOpenChange={(open) => !open && setEditingVoiceIndex(null)}
        >
          <DialogContent className="overflow-y-auto">
            <DialogTitle className="hidden">
              {instruments[editingVoiceIndex].meta.name}
            </DialogTitle>
            <DialogDescription className="hidden">
              {instruments[editingVoiceIndex].meta.name}
            </DialogDescription>
            <DialogCloseButton />

            <div className="mt-2 h-32">
              <InstrumentHeader
                index={editingVoiceIndex}
                color={INSTRUMENT_COLORS[editingVoiceIndex]}
                runtime={instrumentRuntimes.current[editingVoiceIndex]}
              />
            </div>
            <InstrumentParamsControl
              key={`mobile-edit-instrument-${editingVoiceIndex}-${instrumentRuntimesVersion}`}
              index={editingVoiceIndex}
              instrumentIndex={editingVoiceIndex}
              mobile
              runtime={instrumentRuntimes.current[editingVoiceIndex]}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
