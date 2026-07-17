import { cn } from "./utils";

/**
 * Returns className for interactable highlight effect
 * Used to indicate elements that are interactable in specific modes
 * Uses brightness filter to work with any background (gradients, etc)
 */
function interactableHighlight(isInteractable: boolean): string {
  return cn({
    "animate-brightness-pulse interactable-highlight-border": isInteractable,
  });
}

/**
 * Returns className for the "copied" indicator highlight
 * Used to show the current copy source when in paste mode
 */
function copiedItemHighlight(isCopied: boolean): string {
  return cn({
    "animate-brightness-blink *:pointer-events-none **:select-none": isCopied,
  });
}

export { interactableHighlight, copiedItemHighlight };
