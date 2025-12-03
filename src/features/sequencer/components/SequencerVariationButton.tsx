import React, { forwardRef } from "react";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";
import { usePatternStore } from "../store/usePatternStore";

interface SequencerVariationButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
export const SequencerVariationButton = forwardRef<
  HTMLButtonElement,
  SequencerVariationButtonProps
>(({ variation, onClick, className, ...props }, ref) => {
  const currentVariation = usePatternStore((state) => state.variation);
  const setVariation = usePatternStore((state) => state.setVariation);

  const displayVariation = variation === 0 ? "A" : "B";
  const isActive = currentVariation === variation;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    setVariation(variation);
    onClick?.(e);
  };

  return (
    <Button
      ref={ref}
      variant="hardware"
      onClick={handleClick}
      className={cn(
        "font-pixel relative flex items-start justify-start overflow-hidden transition-colors duration-400",
        {
          "border-primary text-primary transition-colors": isActive,
        },
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded-tr rounded-bl transition-colors duration-400",
          {
            "bg-primary": isActive,
          },
        )}
      >
        {displayVariation}
      </span>
    </Button>
  );
});
SequencerVariationButton.displayName = "SequencerVariationButton";
