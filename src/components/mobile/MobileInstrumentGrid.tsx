import { useCallback, useState } from "react";

import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogTitle,
} from "@/components/ui/Dialog";
import { playInstrumentSample } from "@/lib/audio/engine";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { INSTRUMENT_COLORS } from "../instrument/instrumentColors";
import { InstrumentHeader } from "../instrument/InstrumentHeader";
import { InstrumentParamsControl } from "../instrument/InstrumentParamsControl";
import type { InstrumentMode } from "./MobileInstrumentControl";

interface MobileInstrumentGridProps {
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  mode: InstrumentMode;
}

export const MobileInstrumentGrid: React.FC<MobileInstrumentGridProps> = ({
  instrumentRuntimes,
  instrumentRuntimesVersion,
  mode,
}) => {
  const instruments = useInstrumentsStore((state) => state.instruments);
  const [editingVoiceIndex, setEditingVoiceIndex] = useState<number | null>(
    null,
  );

  const handleInstrumentClick = useCallback(
    (voiceIndex: number) => {
      const runtime = instrumentRuntimes[voiceIndex];

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
        {Array.from({ length: 8 }).map((_, index) => {
          // Reverse row order: bottom row = 1,2 ... top row = 7,8
          const row = Math.floor(index / 2); // Which row (0-3)
          const col = index % 2; // Which column (0-1)
          const flippedRow = 3 - row; // Flip row order
          const voiceIndex = flippedRow * 2 + col; // Calculate voiceIndex from flipped position
          const runtime = instrumentRuntimes[voiceIndex];
          const isLoaded = !!runtime;

          return (
            <button
              key={`instrument-${voiceIndex}`}
              onTouchStart={() => handleInstrumentClick(voiceIndex)}
              disabled={!isLoaded}
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
                className="pointer-events-none flex-col items-start"
              />
            </button>
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
            <DialogCloseButton />

            <div className="mt-2 h-1/12">
              <InstrumentHeader
                index={editingVoiceIndex}
                color={INSTRUMENT_COLORS[editingVoiceIndex]}
                runtime={instrumentRuntimes[editingVoiceIndex]}
              />
            </div>
            <InstrumentParamsControl
              key={`mobile-edit-instrument-${editingVoiceIndex}-${instrumentRuntimesVersion}`}
              index={editingVoiceIndex}
              instrumentIndex={editingVoiceIndex}
              mobile
              runtime={instrumentRuntimes[editingVoiceIndex]}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
