import { Button } from "@/components/ui";
import { useSequencerControl } from "@/hooks/sequencer/useSequencerControl";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";
import { IconWithLabel } from "../../common/IconWithLabel";

export const MobileSequencerContextMenu: React.FC = () => {
  const { variation, variationCycle, setVariation, setVariationCycle } =
    useSequencerControl();
  const pattern = usePatternStore((state) => state.pattern);

  // Get the other variation (0 -> 1, 1 -> 0)
  const otherVariation = variation === 0 ? 1 : 0;

  const displayVariation = variation === 0 ? "A" : "B";

  // Toggle to the other variation
  const toggleVariation = () => {
    setVariation(otherVariation);
  };

  return (
    <div className="border-border bg-surface flex flex-col gap-2 border-t p-2">
      {/* Variation and Cycle Row */}
      <div className="flex gap-2">
        <div className="flex h-full flex-col items-center justify-center px-0.5">
          <IconWithLabel icon={displayVariation} label="VAR" />
        </div>

        {/* Variation Preview Toggle */}
        <button
          onClick={toggleVariation}
          className="hardware-button-group hover:bg-surface-muted flex w-1/3 items-center justify-center rounded-lg p-1 transition-colors"
        >
          {/* 8x16 grid showing the other variation */}
          <div className="grid h-full w-full grid-cols-16 grid-rows-8 gap-px">
            {Array.from({ length: 8 }).map((_, voiceIdx) => {
              const voiceIndex = 7 - voiceIdx; // Reversed like in the main grid
              const triggers =
                pattern[voiceIndex].variations[otherVariation].triggers;

              return triggers.map((isTriggerOn, stepIndex) => (
                <div
                  key={`preview-${voiceIndex}-${stepIndex}`}
                  className={cn("h-full w-full", {
                    "bg-primary": isTriggerOn,
                    "bg-instrument": !isTriggerOn,
                  })}
                />
              ));
            })}
          </div>
        </button>

        <div className="w-2/3">
          {/* Cycle Selector */}
          <div className="hardware-button-group flex flex-1 rounded-lg">
            <Button
              variant="hardware"
              size="sm"
              className={cn("flex-1 rounded-l-lg rounded-r-none", {
                "text-primary": variationCycle === "A",
              })}
              onClick={() => setVariationCycle("A")}
            >
              A
            </Button>
            <Button
              variant="hardware"
              size="sm"
              className={cn("flex-1 rounded-none", {
                "text-primary": variationCycle === "B",
              })}
              onClick={() => setVariationCycle("B")}
            >
              B
            </Button>
            <Button
              variant="hardware"
              size="sm"
              className={cn("flex-1 rounded-none", {
                "text-primary": variationCycle === "AB",
              })}
              onClick={() => setVariationCycle("AB")}
            >
              AB
            </Button>
            <Button
              variant="hardware"
              size="sm"
              className={cn(
                "flex-1 rounded-l-none rounded-r-lg text-[10px] leading-tight",
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
          </div>
        </div>
      </div>
    </div>
  );
};
