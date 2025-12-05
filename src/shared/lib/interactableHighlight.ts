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
