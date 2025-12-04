import { cn } from "./utils";

/**
 * Returns className for interactable highlight effect
 * Used to indicate elements that are interactable in specific modes
 * Only animates the outline, not the inner content
 */
export function interactableHighlight(isInteractable: boolean): string {
  return cn({
    "outline outline-2 outline-offset-1 outline-ring/40 focus-visible:outline focus-visible:outline-ring/50 focus-visible:outline-2 animate-outline-pulse":
      isInteractable,
  });
}
