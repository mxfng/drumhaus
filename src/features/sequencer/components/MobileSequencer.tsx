import { useState } from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { INSTRUMENT_COLORS } from "@/features/instrument/lib/colors";
import { useSequencerControl } from "../hooks/useSequencerControl";
import { usePatternStore } from "../store/usePatternStore";
import { MobileSequencerRow } from "./MobileSequencerRow";
import { MobileSequencerRowSelector } from "./MobileSequencerRowSelector";
import { SequencerStepIndicator } from "./SequencerStepIndicator";

export const MobileSequencer: React.FC = () => {
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const toggleStep = usePatternStore((state) => state.toggleStep);

  const [openVoiceIndex, setOpenVoiceIndex] = useState<number | null>(null);

  const { copySequence, pasteSequence, clearSequence, randomSequence } =
    useSequencerControl();

  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  return (
    <div className="border-border flex h-full min-h-112 w-full flex-col overflow-auto">
      {/* Step indicators row */}
      <div className="bg-surface sticky top-0 z-10 grid grid-cols-[3rem_1fr] gap-px">
        {/* Empty space for the instrument selector column */}
        <div className="bg-instrument" />
        {/* Step indicators */}
        <div className="bg-surface grid grid-cols-16">
          {steps.map((step) => (
            <SequencerStepIndicator
              key={`step-indicator-${step}`}
              stepIndex={step}
              variation={variation}
              playbackVariation={playbackVariation}
            />
          ))}
        </div>
      </div>

      {/* Main grid with selector and sequencer rows */}
      <div className="grid flex-1 auto-rows-[minmax(3.5rem,1fr)] gap-px">
        {Array.from({ length: 8 }).map((_, index) => {
          const voiceIndex = 7 - index;
          const triggers = pattern[voiceIndex].variations[variation].triggers;
          const isOpen = openVoiceIndex === voiceIndex;

          return (
            <div
              key={`sequencer-row-${voiceIndex}`}
              className="relative grid grid-cols-[3rem_1fr] gap-px"
            >
              {/* Selection border overlay */}
              {isOpen && (
                <div
                  className="pointer-events-none absolute inset-0 z-10"
                  style={{
                    boxShadow: `inset 0 0 0 3px ${INSTRUMENT_COLORS[voiceIndex]}`,
                  }}
                />
              )}
              <MobileSequencerRowSelector
                voiceIndex={voiceIndex}
                rowIndex={index}
                isOpen={isOpen}
                onOpenChange={(open) => {
                  if (open) {
                    // Opening this row
                    setOpenVoiceIndex(voiceIndex);
                  } else if (openVoiceIndex === voiceIndex) {
                    // Only close if this row is currently open
                    setOpenVoiceIndex(null);
                  }
                  // Ignore close events from rows that aren't currently open
                }}
                onCopy={copySequence}
                onPaste={pasteSequence}
                onClear={clearSequence}
                onRandom={randomSequence}
              />
              <MobileSequencerRow
                voiceIndex={voiceIndex}
                variation={variation}
                triggers={triggers}
                onToggleStep={(stepIndex) =>
                  toggleStep(voiceIndex, variation, stepIndex)
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
