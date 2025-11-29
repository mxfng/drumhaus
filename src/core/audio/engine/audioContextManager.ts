import { getContext, start } from "tone/build/esm/index";

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

const ENSURE_THROTTLE_MS = 250;

/**
 * Ensure the shared Tone.js audio context is running.
 * Safe to call on every user gesture; throttles redundant resume attempts.
 */
export async function ensureAudioContextRunning(
  source: string = "unknown",
): Promise<boolean> {
  const context = getContext();
  const now = performance.now();

  health.state = context.state as AudioContextState;
  health.lastCheck = now;

  // Avoid hammering resume/start in quick succession
  if (
    health.lastResume &&
    now - health.lastResume < ENSURE_THROTTLE_MS &&
    context.state === "running"
  ) {
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
