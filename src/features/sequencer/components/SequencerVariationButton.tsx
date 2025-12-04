import React, { forwardRef } from "react";

import { buttonActive } from "@/shared/lib/buttonActive";
import { interactableHighlight } from "@/shared/lib/interactableHighlight";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";
import { usePatternStore } from "../store/usePatternStore";
import { VARIATION_LABELS, VariationId } from "../types/sequencer";

interface SequencerVariationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variation: VariationId;
}

/**
 * Desktop/Tablet: Variation button for A/B selection.
 *
 * - Shows the variation (A or B) as a label.
 * - Displays the pattern preview in the background.
 * - Clicking switches the current variation to this variation.
 * - Shows a primary outline when this is the currently selected variation.
 */
export const SequencerVariationButton = forwardRef<
  HTMLButtonElement,
  SequencerVariationButtonProps
>(({ variation, onClick, className, ...props }, ref) => {
  const currentVariation = usePatternStore((state) => state.variation);
  const setVariation = usePatternStore((state) => state.setVariation);
  const mode = usePatternStore((state) => state.mode);
  const writeChainStep = usePatternStore((state) => state.writeChainStep);

  const displayVariation = VARIATION_LABELS[variation] ?? "?";
  const isActive = currentVariation === variation;
  const isChainEdit = mode.type === "variationChain";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isChainEdit) {
      writeChainStep(variation);
    } else {
      setVariation(variation);
    }
    onClick?.(e);
  };

  return (
    <Button
      ref={ref}
      variant="hardware"
      onClick={handleClick}
      className={cn(
        "font-pixel flex items-start justify-start p-1 transition-colors duration-400",
        buttonActive(isActive && !isChainEdit),
        interactableHighlight(isChainEdit),
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded-tr rounded-bl transition-colors duration-400",
          {
            "bg-primary": isActive && !isChainEdit,
          },
        )}
      >
        {displayVariation}
      </span>
    </Button>
  );
});
SequencerVariationButton.displayName = "SequencerVariationButton";
