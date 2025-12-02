import { HardwareModule } from "@/shared/components/HardwareModule";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";
import { Button, Tooltip } from "@/shared/ui";
import { usePatternStore } from "../store/usePatternStore";
import { SequencerVariationButton } from "./SequencerVariationButton";
import { SequencerVariationPreview } from "./SequencerVariationPreview";

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
  const { variation } = usePatternStore();

  const potatoMode = usePerformanceStore((state) => state.potatoMode);

  // const {
  //   variationCycle,
  //   setVariationCycle,
  //   copySequence,
  //   pasteSequence,
  //   clearSequence,
  //   randomSequence,
  // } = useSequencerControl();

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-4">
        {/* Variation chain and sequencer overview row */}
        <Tooltip content={TOOLTIPS.VARIATION_CHAIN_SET}>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
            disabled
          >
            <span className="leading-3">vari chain</span>
          </Button>
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_CHAIN_TOGGLE_ON}>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
            disabled
          >
            <span>chain on</span>
          </Button>
        </Tooltip>
        <div className="col-span-2">
          {potatoMode ? (
            <div className="h-8 w-full" />
          ) : (
            <SequencerVariationPreview variation={variation} />
          )}
        </div>

        {/* Variation pattern selection row */}
        <Tooltip content={TOOLTIPS.VARIATION_A}>
          <SequencerVariationButton variation={0} />
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_B}>
          <SequencerVariationButton variation={1} />
        </Tooltip>

        {/* mock for now */}
        <Button
          variant="hardware"
          className="font-pixel relative flex items-start justify-start overflow-hidden"
          disabled
        >
          <span className="bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded">
            C
          </span>
        </Button>

        {/* mock for now */}
        <Button
          variant="hardware"
          className="font-pixel relative flex items-start justify-start overflow-hidden"
          disabled
        >
          <span className="bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded">
            D
          </span>
        </Button>

        {/* Pattern actions row */}
        <div className="col-span-4 mx-auto grid w-5/6 grid-cols-4 gap-2">
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
            disabled
          >
            <span>copy</span>
          </Button>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
            disabled
          >
            <span>paste</span>
          </Button>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
            disabled
          >
            <span>clear</span>
          </Button>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
            disabled
          >
            <span>random</span>
          </Button>
        </div>
      </div>
    </HardwareModule>
  );
};
