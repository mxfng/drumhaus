import * as Popover from "@radix-ui/react-popover";
import { ClipboardPaste, Copy, Dices, Eraser } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";

export const INSTRUMENT_COLORS = [
  "var(--color-track-blue)",
  "var(--color-track-orange)",
  "var(--color-track-red)",
  "var(--color-track-green)",
  "var(--color-track-blue)",
  "var(--color-track-orange)",
  "var(--color-track-red)",
  "var(--color-track-green)",
];

interface InstrumentRowSelectorProps {
  voiceIndex: number;
  rowIndex: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onCopy: () => void;
  onPaste: () => void;
  onClear: () => void;
  onRandom: () => void;
}

export const InstrumentRowSelector: React.FC<InstrumentRowSelectorProps> = ({
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

  return (
    <Popover.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Popover.Trigger asChild>
        <button
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
          className="border-border bg-surface z-50 w-[calc(100vw-3rem)] border p-2"
        >
          {/* Action Buttons Row */}
          <div className="hardware-button-group flex gap-2 rounded-lg">
            <Popover.Close asChild>
              <Button
                variant="hardware"
                size="sm"
                className="flex-1 rounded-l-lg"
                onClick={onCopy}
              >
                <Copy size={14} />
              </Button>
            </Popover.Close>
            <Popover.Close asChild>
              <Button
                variant="hardware"
                size="sm"
                className="flex-1"
                onClick={onPaste}
              >
                <ClipboardPaste size={14} />
              </Button>
            </Popover.Close>
            <Popover.Close asChild>
              <Button
                variant="hardware"
                size="sm"
                className="flex-1"
                onClick={onClear}
              >
                <Eraser size={14} />
              </Button>
            </Popover.Close>
            <Popover.Close asChild>
              <Button
                variant="hardware"
                size="sm"
                className="flex-1 rounded-r-lg"
                onClick={onRandom}
              >
                <Dices size={14} />
              </Button>
            </Popover.Close>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
