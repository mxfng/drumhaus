import { useState } from "react";
import { BsFillEraserFill } from "react-icons/bs";
import { FaDice } from "react-icons/fa";
import { IoBrushSharp, IoCopySharp } from "react-icons/io5";

import { Button, Label, Tooltip } from "@/components/ui";
import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";

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
  // Get state from Sequencer Store
  const variation = usePatternStore((state) => state.variation);
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const pattern = usePatternStore((state) => state.pattern);
  const currentTriggers = usePatternStore(
    (state) =>
      state.pattern[state.voiceIndex].variations[state.variation].triggers,
  );

  // Get actions from store
  const setVariation = usePatternStore((state) => state.setVariation);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);
  const updateSequence = usePatternStore((state) => state.updatePattern);
  const clearSequence = usePatternStore((state) => state.clearPattern);
  const [copiedTriggers, setCopiedTriggers] = useState<boolean[] | undefined>();
  const [copiedVelocities, setCopiedVelocities] = useState<
    number[] | undefined
  >();

  const copySequence = () => {
    setCopiedTriggers(currentTriggers);
    setCopiedVelocities(pattern[voiceIndex].variations[variation].velocities);
  };

  const pasteSequence = () => {
    if (copiedTriggers && copiedVelocities) {
      updateSequence(voiceIndex, variation, copiedTriggers, copiedVelocities);
    }
  };

  const handleClearSequence = () => {
    clearSequence(voiceIndex, variation);
  };

  const handleRandomSequence = () => {
    const randomTriggers: boolean[] = Array.from(
      { length: STEP_COUNT },
      () => Math.random() < 0.5,
    );
    const randomVelocities: number[] = Array.from({ length: STEP_COUNT }, () =>
      Math.random(),
    );
    updateSequence(voiceIndex, variation, randomTriggers, randomVelocities);
  };

  return (
    <div className="flex flex-col px-4">
      <Label className="text-foreground-muted pb-2">SEQUENCER</Label>

      <div className="flex justify-between gap-4 pb-8">
        <div className="relative">
          <div className="hardware-button-group flex rounded-lg">
            <Tooltip content={TOOLTIPS.VARIATION_A}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("w-8 rounded-l-lg rounded-r-none", {
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
                className={cn("w-8 rounded-l-none rounded-r-lg", {
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

        <div className="relative">
          <div className="hardware-button-group flex rounded-lg">
            <Tooltip content={TOOLTIPS.CYCLE_A}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("w-10 rounded-l-lg rounded-r-none", {
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
                className={cn("w-10 rounded-none", {
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
                className={cn("w-10 rounded-none", {
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
                  "w-10 rounded-l-none rounded-r-lg text-[10px] leading-tight",
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
              <IoCopySharp />
            </Button>
          </Tooltip>
          <Tooltip content={TOOLTIPS.PASTE}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-none"
              onClick={pasteSequence}
            >
              <IoBrushSharp />
            </Button>
          </Tooltip>
          <Tooltip content={TOOLTIPS.CLEAR}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-none"
              onClick={handleClearSequence}
            >
              <BsFillEraserFill />
            </Button>
          </Tooltip>
          <Tooltip content={TOOLTIPS.RANDOM}>
            <Button
              variant="hardware"
              size="sm"
              className="rounded-l-none rounded-r-lg"
              onClick={handleRandomSequence}
            >
              <FaDice />
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
