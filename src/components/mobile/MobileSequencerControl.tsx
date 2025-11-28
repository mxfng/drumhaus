import { Button } from "@/components/ui";
import { useSequencerControl } from "@/hooks/sequencer/useSequencerControl";
import { cn } from "@/lib/utils";

export const MobileSequencerControl: React.FC = () => {
  const { variation, variationCycle, setVariation, setVariationCycle } =
    useSequencerControl();

  return (
    <div className="border-border bg-surface flex flex-col gap-2 border-t p-2">
      {/* Variation and Cycle Row */}
      <div className="flex gap-2">
        {/* Variation Selector */}
        <div className="hardware-button-group flex w-1/3 rounded-lg">
          <Button
            variant="hardware"
            size="sm"
            className={cn("rounded-l-lg rounded-r-none px-3", {
              "text-primary": variation === 0,
            })}
            onClick={() => setVariation(0)}
          >
            A
          </Button>
          <Button
            variant="hardware"
            size="sm"
            className={cn("rounded-l-none rounded-r-lg px-3", {
              "text-primary": variation === 1,
            })}
            onClick={() => setVariation(1)}
          >
            B
          </Button>
        </div>

        {/* Cycle Selector */}
        <div className="hardware-button-group flex w-2/3 flex-1 rounded-lg">
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
  );
};
