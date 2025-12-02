import {
  HardwareModule,
  HardwareModuleLabel,
  HardwareModuleSpacer,
} from "@/shared/components/HardwareModule";
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
      <HardwareModuleLabel>sequencer</HardwareModuleLabel>
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
        <div className="col-span-2">
          {potatoMode ? (
            <div className="h-8 w-full" />
          ) : (
            <SequencerVariationPreview variation={variation} />
          )}
        </div>
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
      <HardwareModuleSpacer />
    </HardwareModule>
  );
};
