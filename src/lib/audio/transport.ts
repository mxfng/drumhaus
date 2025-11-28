import { getTransport, Ticks } from "tone";

import { SEQUENCE_SUBDIVISION, STEP_COUNT } from "./engine/constants";

/**
 * Calculate current step index (0-15) from transport ticks
 * Use this directly in requestAnimationFrame loops to avoid React re-renders
 */
export function getCurrentStepFromTransport(): number {
  const transport = getTransport();
  const ticks = transport.ticks;
  const ticksPerStep = Ticks(SEQUENCE_SUBDIVISION).valueOf();
  const currentStep = Math.floor(ticks / ticksPerStep) % STEP_COUNT;
  return currentStep;
}
