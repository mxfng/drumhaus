/**
 * Recovery-tier instrumentation for the idle-tab silence bug (issue #319).
 *
 * The context guards escalate resume -> rebuild -> reload; these counters
 * record which tier actually fires in the wild. They persist in
 * localStorage so the reload fallback (which would otherwise erase its own
 * evidence) survives, and the debug overlay is the read surface - there is
 * no analytics backend.
 *
 * Counting must never break recovery: every storage access is guarded, so
 * private-browsing/storage-denied modes degrade counting to a no-op.
 */

const RECOVERY_STATS_STORAGE_KEY = "drumhaus-audio-recovery-stats";
const RECOVERY_STATS_VERSION = 1;

/** One countable step of the guards' recovery escalation. */
type RecoveryEvent =
  | "resumeAttempt" // eager ensure ran (visibility/focus/gesture, throttled)
  | "resumeSuccess" // eager ensure left the context running
  | "stallDetected" // a scheduled check found the context clock stalled
  | "rebuildAttempt" // still stalled after resume; in-place rebuild started
  | "rebuildSuccess" // the rebuild revived the clock
  | "rebuildTimeout" // the rebuild hit its timeout bound
  | "reloadFallback"; // last resort: page reload triggered

type RecoveryCounters = Record<RecoveryEvent, number>;

interface RecoveryStats {
  version: number;
  counters: RecoveryCounters;
  /** Epoch ms of the most recent occurrence of each event. */
  lastEventAt: Partial<Record<RecoveryEvent, number>>;
}

function emptyRecoveryCounters(): RecoveryCounters {
  return {
    resumeAttempt: 0,
    resumeSuccess: 0,
    stallDetected: 0,
    rebuildAttempt: 0,
    rebuildSuccess: 0,
    rebuildTimeout: 0,
    reloadFallback: 0,
  };
}

function emptyRecoveryStats(): RecoveryStats {
  return {
    version: RECOVERY_STATS_VERSION,
    counters: emptyRecoveryCounters(),
    lastEventAt: {},
  };
}

/**
 * Reads the persisted stats. Missing, corrupt, or version-mismatched
 * payloads fall back to zeroed counters; unknown keys are dropped and
 * missing ones read as zero.
 */
function getRecoveryStats(): RecoveryStats {
  try {
    const raw = globalThis.localStorage.getItem(RECOVERY_STATS_STORAGE_KEY);
    if (!raw) return emptyRecoveryStats();

    const parsed = JSON.parse(raw) as Partial<RecoveryStats> | null;
    if (!parsed || parsed.version !== RECOVERY_STATS_VERSION) {
      return emptyRecoveryStats();
    }

    const stats = emptyRecoveryStats();
    for (const event of Object.keys(stats.counters) as RecoveryEvent[]) {
      const count = parsed.counters?.[event];
      if (typeof count === "number") stats.counters[event] = count;
      const at = parsed.lastEventAt?.[event];
      if (typeof at === "number") stats.lastEventAt[event] = at;
    }
    return stats;
  } catch {
    return emptyRecoveryStats();
  }
}

/**
 * Increments one counter and stamps its last-occurrence time, writing
 * through to localStorage synchronously - the reloadFallback increment must
 * land before the navigation that immediately follows it. Fail-silent:
 * counting is best-effort and recovery proceeds even without storage.
 */
function recordRecoveryEvent(event: RecoveryEvent): void {
  try {
    const stats = getRecoveryStats();
    stats.counters[event] += 1;
    stats.lastEventAt[event] = Date.now();
    globalThis.localStorage.setItem(
      RECOVERY_STATS_STORAGE_KEY,
      JSON.stringify(stats),
    );
  } catch {
    // Storage unavailable; drop the count rather than disturb recovery.
  }
}

export {
  emptyRecoveryCounters,
  getRecoveryStats,
  RECOVERY_STATS_STORAGE_KEY,
  recordRecoveryEvent,
};
export type { RecoveryCounters, RecoveryEvent, RecoveryStats };
