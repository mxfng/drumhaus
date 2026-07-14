/**
 * Pre-intro reveal safety net.
 *
 * The intro wave is deferred until the app's readiness gate opens (kit and
 * waveforms loaded). On slow cold loads that can take far longer than any
 * fixed timeout, so a mount-anchored timer races the gate and reveals the UI
 * before — or in the middle of — the wave (#330).
 *
 * Resource-timing entries serve as a loading heartbeat instead: while assets
 * are still arriving the reveal keeps waiting. It fires only after `quietMs`
 * of loading silence, or `maxMs` overall, whichever comes first.
 */

interface RevealWatchdogOptions {
  onReveal: () => void;
  quietMs?: number;
  maxMs?: number;
}

const DEFAULT_QUIET_MS = 3000;
const DEFAULT_MAX_MS = 15000;

/**
 * Starts the watchdog. Calls `onReveal` at most once; returns a dispose
 * function that cancels everything (safe to call after firing).
 */
function startRevealWatchdog({
  onReveal,
  quietMs = DEFAULT_QUIET_MS,
  maxMs = DEFAULT_MAX_MS,
}: RevealWatchdogOptions): () => void {
  let quietTimer: ReturnType<typeof setTimeout>;
  let ceilingTimer: ReturnType<typeof setTimeout>;
  let observer: PerformanceObserver | null = null;
  let done = false;

  const dispose = () => {
    done = true;
    clearTimeout(quietTimer);
    clearTimeout(ceilingTimer);
    observer?.disconnect();
    observer = null;
  };

  const reveal = () => {
    if (done) return;
    dispose();
    onReveal();
  };

  quietTimer = setTimeout(reveal, quietMs);
  ceilingTimer = setTimeout(reveal, maxMs);

  try {
    observer = new PerformanceObserver(() => {
      if (done) return;
      clearTimeout(quietTimer);
      quietTimer = setTimeout(reveal, quietMs);
    });
    observer.observe({ type: "resource", buffered: true });
  } catch {
    // No resource-timing support: fall back to the plain quiet timeout.
  }

  return dispose;
}

export { startRevealWatchdog };
