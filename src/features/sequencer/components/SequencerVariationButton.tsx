import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";
import { usePatternStore } from "../store/usePatternStore";

interface SequencerVariationButtonProps {
  variation: number;
}

/**
 * Desktop/Tablet: Variation button for A/B selection.
 *
 * - Shows the variation (A or B) as a label.
 * - Displays the pattern preview in the background.
 * - Clicking switches the current variation to this variation.
 * - Shows a primary outline when this is the currently selected variation.
 */
export const SequencerVariationButton: React.FC<
  SequencerVariationButtonProps
> = ({ variation }) => {
  const { variation: currentVariation, setVariation } = usePatternStore();

  const displayVariation = variation === 0 ? "A" : "B";
  const isActive = currentVariation === variation;

  return (
    <Button
      variant="hardware"
      size="sm"
      onClick={() => setVariation(variation)}
      className={cn("relative overflow-hidden", {
        "ring-primary ring": isActive,
      })}
    >
      <span
        className={cn({
          "text-primary": isActive,
        })}
      >
        {displayVariation}
      </span>
    </Button>
  );
};
