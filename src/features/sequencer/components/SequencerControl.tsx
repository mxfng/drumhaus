import { ClipboardPaste, Copy, Dices, Eraser } from "lucide-react";

import { Button, Label, Tooltip } from "@/components/ui";
import { useSequencerControl } from "@/features/sequencer/hooks/useSequencerControl";
import { cn } from "@/lib/utils";

// Tooltip constants
const TOOLTIPS = {
  VARIATION_A: "Select variation A",
  VARIATION_B: "Select variation B",
  CYCLE_A: "Play only variation A",
  CYCLE_B: "Play only variation B",
  CYCLE_AB: "Alternate A and B each bar",
  CYCLE_AAAB: "Play A three times, then B",
  COPY: "Copy current sequence",
  PASTE: "Paste copied sequence",
  CLEAR: "Clear current sequence",
  RANDOM: "Generate random sequence",
} as const;

export const SequencerControl: React.FC = () => {
  const {
    variation,
    variationCycle,
    setVariation,
    setVariationCycle,
    copySequence,
    pasteSequence,
    clearSequence,
    randomSequence,
  } = useSequencerControl();

  return (
    <div className="flex w-full flex-col px-4">
      <Label className="text-foreground-muted pb-2">SEQUENCER</Label>

      <div className="flex justify-between gap-4 pb-8">
        <div className="relative w-1/3">
          <div className="hardware-button-group grid w-full grid-cols-2 rounded-lg">
            <Tooltip content={TOOLTIPS.VARIATION_A}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("rounded-l-lg rounded-r-none", {
                  "text-primary": variation === 0,
                })}
                onClick={() => setVariation(0)}
              >
                A
              </Button>
            </Tooltip>
            <Tooltip content={TOOLTIPS.VARIATION_B}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("rounded-l-none rounded-r-lg", {
                  "text-primary": variation === 1,
                })}
                onClick={() => setVariation(1)}
              >
                B
              </Button>
            </Tooltip>
          </div>
          <Label className="absolute -bottom-5 left-1">VARI</Label>
        </div>

        <div className="relative w-2/3">
          <div className="hardware-button-group grid grid-cols-4 rounded-lg">
            <Tooltip content={TOOLTIPS.CYCLE_A}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("rounded-l-lg rounded-r-none", {
                  "text-primary": variationCycle === "A",
                })}
                onClick={() => setVariationCycle("A")}
              >
                A
              </Button>
            </Tooltip>
            <Tooltip content={TOOLTIPS.CYCLE_B}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("rounded-none", {
                  "text-primary": variationCycle === "B",
                })}
                onClick={() => setVariationCycle("B")}
              >
                B
              </Button>
            </Tooltip>
            <Tooltip content={TOOLTIPS.CYCLE_AB}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("rounded-none", {
                  "text-primary": variationCycle === "AB",
                })}
                onClick={() => setVariationCycle("AB")}
              >
                AB
              </Button>
            </Tooltip>
            <Tooltip content={TOOLTIPS.CYCLE_AAAB}>
              <Button
                variant="hardware"
                size="sm"
                className={cn(
                  "rounded-l-none rounded-r-lg text-[10px] leading-tight",
                  {
                    "text-primary": variationCycle === "AAAB",
                  },
                )}
                onClick={() => setVariationCycle("AAAB")}
              >
                AA
                <br />
                AB
              </Button>
            </Tooltip>
          </div>
          <Label className="absolute -bottom-5 left-1">CYCLE</Label>
        </div>
      </div>

      <div className="pb-4">
        <div className="hardware-button-group grid grid-cols-4 rounded-lg">
          <Tooltip content={TOOLTIPS.COPY}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-l-lg rounded-r-none"
              onClick={copySequence}
            >
              <Copy size={16} />
            </Button>
          </Tooltip>
          <Tooltip content={TOOLTIPS.PASTE}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-none"
              onClick={pasteSequence}
            >
              <ClipboardPaste size={16} />
            </Button>
          </Tooltip>
          <Tooltip content={TOOLTIPS.CLEAR}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-none"
              onClick={clearSequence}
            >
              <Eraser size={16} />
            </Button>
          </Tooltip>
          <Tooltip content={TOOLTIPS.RANDOM}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-l-none rounded-r-lg"
              onClick={randomSequence}
            >
              <Dices size={16} />
            </Button>
          </Tooltip>
        </div>
        <div className="mt-1 grid grid-cols-4 text-center">
          <Label>COPY</Label>
          <Label>PASTE</Label>
          <Label>CLEAR</Label>
          <Label>RAND</Label>
        </div>
      </div>
    </div>
  );
};
