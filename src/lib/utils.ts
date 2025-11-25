import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Quantize a value to a step size. This is intended to stay in the UI space.
 */
export const getQuantizedValue = (value: number, step: number): number => {
  const normalizedStep = step > 0 ? step : 1;
  return Math.round(value / normalizedStep) * normalizedStep;
};
