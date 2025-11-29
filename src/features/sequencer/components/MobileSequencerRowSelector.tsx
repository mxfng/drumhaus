import * as Popover from "@radix-ui/react-popover";
import { ClipboardPaste, Copy, Dices, Eraser } from "lucide-react";

import { INSTRUMENT_COLORS } from "@/features/instrument/lib/colors";
import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";

interface MobileSequencerRowSelectorProps {
  voiceIndex: number;
  rowIndex: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onRandom: () => void;
}

export const MobileSequencerRowSelector: React.FC<
  MobileSequencerRowSelectorProps
> = ({
  voiceIndex,
  rowIndex,
  isOpen,
  onOpenChange,
  onCopy,
  onPaste,
  onClear,
  onRandom,
}) => {
  const instruments = useInstrumentsStore((state) => state.instruments);
  const instrument = instruments[voiceIndex];
  const setVoiceIndex = usePatternStore((state) => state.setVoiceIndex);

  // Show popup above if in bottom half (rowIndex > 3), below otherwise
  const side = rowIndex > 3 ? "top" : "bottom";

  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Set the voiceIndex when popover opens so operations work on correct instrument
      setVoiceIndex(voiceIndex);
    }
    onOpenChange(open);
  };

  const handleTriggerClick = () => {
    // Handle the click directly to ensure smooth switching between rows
    if (isOpen) {
      // Clicking the same row - close it
      onOpenChange(false);
    } else {
      // Clicking a different row or opening when none selected - open it
      setVoiceIndex(voiceIndex);
      onOpenChange(true);
    }
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange} modal={false}>
      <Popover.Trigger asChild>
        <button
          data-instrument-selector
          onClick={handleTriggerClick}
          className={cn(
            "flex h-full w-full flex-col items-center justify-center text-xs transition-colors",
            "bg-surface-muted hover:bg-surface data-[state=open]:bg-surface",
          )}
          style={{
            borderLeftColor: INSTRUMENT_COLORS[voiceIndex],
            borderLeftWidth: "3px",
          }}
        >
          <span
            className="font-pixel text-base leading-tight"
            style={{ color: INSTRUMENT_COLORS[voiceIndex] }}
          >
            {voiceIndex + 1}
          </span>
          <span className="text-foreground-muted mt-0.5 truncate text-[9px]">
            {instrument.meta.name.slice(0, 3)}
          </span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          side={side}
          align="start"
          sideOffset={0}
          className="z-50 w-[calc(100vw-3rem)] px-2"
          onInteractOutside={(e) => {
            // Prevent closing when clicking another row selector
            // This allows smooth switching between rows
            const target = e.target as HTMLElement;
            const clickedSelector = target.closest(
              "[data-instrument-selector]",
            );
            if (clickedSelector) {
              e.preventDefault();
            }
          }}
        >
          {/* Action Buttons Row */}
          <div className="hardware-button-group flex rounded-lg">
            <Popover.Close asChild>
              <Button
                variant="hardware"
                className="flex-1 rounded-l-lg"
                onClick={onCopy}
              >
                <Copy />
              </Button>
            </Popover.Close>
            <Popover.Close asChild>
              <Button variant="hardware" className="flex-1" onClick={onPaste}>
                <ClipboardPaste />
              </Button>
            </Popover.Close>
            <Popover.Close asChild>
              <Button variant="hardware" className="flex-1" onClick={onClear}>
                <Eraser />
              </Button>
            </Popover.Close>
            <Popover.Close asChild>
              <Button
                variant="hardware"
                className="flex-1 rounded-r-lg"
                onClick={onRandom}
              >
                <Dices />
              </Button>
            </Popover.Close>
          </div>
          <Popover.Arrow className="fill-surface" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
