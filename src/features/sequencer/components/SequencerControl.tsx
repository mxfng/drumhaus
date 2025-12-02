import { Button, Tooltip } from "@/shared/ui";
import { SequencerVariationButton } from "./SequencerVariationButton";

// Tooltip constants
const TOOLTIPS = {
  VARIATION_CHAIN_SET: "Set variation chain",
  VARIATION_CHAIN_SAVE: "Save variation chain",
  VARIATION_CHAIN_TOGGLE_ON: "Toggle variation chain on",
  VARIATION_CHAIN_TOGGLE_OFF: "Toggle variation chain off",
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
  // const {
  //   variationCycle,
  //   setVariationCycle,
  //   copySequence,
  //   pasteSequence,
  //   clearSequence,
  //   randomSequence,
  // } = useSequencerControl();

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex w-full items-center justify-center">
        <mark className="bg-foreground-muted text-surface rounded px-2 text-xs">
          sequencer
        </mark>
      </div>
      {/* <div className="w-full h-12 sm:h-8 border">
            <SequencerVariationPreview variation={variation} />
          </div> */}
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-4">
        <Tooltip content={TOOLTIPS.VARIATION_CHAIN_SET}>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
          >
            <span>vari chain</span>
          </Button>
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_CHAIN_TOGGLE_ON}>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
          >
            <span>chain on</span>
          </Button>
        </Tooltip>
        <div />
        <div />
        <Tooltip content={TOOLTIPS.VARIATION_A}>
          <SequencerVariationButton variation={0} />
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_B}>
          <SequencerVariationButton variation={1} />
        </Tooltip>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>C</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>D</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>copy</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>paste</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>clear</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>random</span>
        </Button>
      </div>
      {/* 
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
      </div> */}
      {/* 
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
      </div> */}
    </div>
  );
};
