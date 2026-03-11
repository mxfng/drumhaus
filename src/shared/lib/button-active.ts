import { cn } from "./utils";

/**
 * Returns className for active/toggled button state
 * Used to indicate buttons that are in an "on" or selected state
 */
export function buttonActive(isActive: boolean): string {
  return cn({
    "border-primary border-2 text-primary transition-colors": isActive,
  });
}
