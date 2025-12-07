import React, { forwardRef } from "react";

import { isSameAsSource } from "@/features/sequencer/lib/clipboard";
import { buttonActive } from "@/shared/lib/buttonActive";
import {
  copiedItemHighlight,
  interactableHighlight,
} from "@/shared/lib/interactableHighlight";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui";
import { VARIATION_CHAIN_COLORS } from "../lib/colors";
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

  // Copy/paste state
  const clipboard = usePatternStore((state) => state.clipboard);
  const copySource = usePatternStore((state) => state.copySource);
  const copyVariation = usePatternStore((state) => state.copyVariation);
  const pasteToVariation = usePatternStore((state) => state.pasteToVariation);

  const displayVariation = VARIATION_LABELS[variation] ?? "?";
  const isActive = currentVariation === variation;
  const isChainEdit = mode.type === "variationChain";
  const isCopyMode = mode.type === "copy";
  const isPasteMode = mode.type === "paste";

  // Check if this variation is the copy source (for dimming in paste mode)
  const isSource =
    isPasteMode &&
    copySource &&
    isSameAsSource(copySource, "variation", null, variation);

  // Determine if button should be highlighted for interactability
  const shouldHighlight =
    isChainEdit || isCopyMode || (isPasteMode && !isSource);
  const shouldShowCopiedHighlight = isSource;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isChainEdit) {
      writeChainStep(variation);
    } else if (isCopyMode) {
      // Copy this variation
      copyVariation(variation);
    } else if (isPasteMode) {
      if (clipboard?.type === "variation" && !isSource) {
        // Paste variation clipboard to this variation
        pasteToVariation(variation);
      } else if (clipboard?.type === "instrument") {
        // Switch to this variation (for instrument paste target)
        setVariation(variation);
      }
    } else {
      setVariation(variation);
    }
    onClick?.(e);
  };

  const chainEditColors = VARIATION_CHAIN_COLORS[variation];

  // In copy/paste mode, don't show active state (focus is on copy/paste, not selection)
  const showActiveState =
    isActive && !isChainEdit && !isCopyMode && !isPasteMode;

  return (
    <Button
      variant="hardware"
      size="lg"
      onClick={handleClick}
      ref={ref}
      className={cn(
        "font-pixel flex items-start justify-start p-1 transition-colors duration-400",
        buttonActive(showActiveState),
        interactableHighlight(shouldHighlight),
        copiedItemHighlight(shouldShowCopiedHighlight),
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded-tr rounded-bl transition-colors duration-400",
          {
            "bg-primary": showActiveState,
          },
          isChainEdit && [
            "border",
            chainEditColors.bg,
            chainEditColors.border,
            chainEditColors.text,
          ],
        )}
      >
        {displayVariation}
      </span>
    </Button>
  );
});
SequencerVariationButton.displayName = "SequencerVariationButton";
