import { BaseContext, getContext, start } from "tone/build/esm/index";

import { AUDIO_CONTEXT_CHECK_THROTTLE_MS } from "../constants";

type AudioContextState = "running" | "suspended" | "closed";

interface AudioContextHealth {
  state: AudioContextState;
  lastCheck: number;
  lastResume: number | null;
}

const health: AudioContextHealth = {
  state: "suspended",
  lastCheck: 0,
  lastResume: null,
};

function throttleAudioContextCheck(
  health: AudioContextHealth,
  context: BaseContext,
): boolean {
  const now = performance.now();
  health.state = context.state as AudioContextState;
  health.lastCheck = now;

  return !!(
    health.lastResume &&
    now - health.lastResume < AUDIO_CONTEXT_CHECK_THROTTLE_MS &&
    health.state === "running"
  );
}

/**
 * Ensure the shared Tone.js audio context is running.
 * Safe to call on every user gesture; throttles redundant resume attempts.
 */
export async function ensureAudioContextIsRunning(
  source: string = "unknown",
): Promise<boolean> {
  const context = getContext();

  // Avoid hammering resume/start in quick succession
  if (throttleAudioContextCheck(health, context)) {
    return true;
  }

  try {
    if (context.state === "suspended") {
      await context.resume();
      health.lastResume = performance.now();
    } else if (context.state !== "running") {
      await start();
      health.lastResume = performance.now();
    }
  } catch (error) {
    console.warn(
      `[audio-context] Failed to ensure running from ${source}:`,
      error,
    );
  }

  health.state = getContext().state as AudioContextState;
  return health.state === "running";
}

export function getAudioContextHealth(): AudioContextHealth {
  // Return a shallow copy to avoid accidental mutation
  return { ...health };
}
