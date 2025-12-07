import { cn } from "./utils";

/**
 * Returns className for interactable highlight effect
 * Used to indicate elements that are interactable in specific modes
 * Uses brightness filter to work with any background (gradients, etc)
 */
export function interactableHighlight(isInteractable: boolean): string {
  return cn({
    "animate-brightness-pulse": isInteractable,
  });
}

/**
 * Returns className for the "copied" indicator highlight
 * Used to show the current copy source when in paste mode
 */
export function copiedItemHighlight(isCopied: boolean): string {
  return cn({
    "animate-brightness-blink *:pointer-events-none **:select-none": isCopied,
  });
}
