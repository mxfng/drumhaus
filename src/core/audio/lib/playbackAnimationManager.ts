import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";

/**
 * Callback invoked on each animation frame during playback
 * @param now - Current timestamp from requestAnimationFrame
 * @param deltaTime - Time elapsed since last frame (ms)
 */
type AnimationCallback = (now: number, deltaTime: number) => void;

/**
 * Listener registry
 */
const listeners = new Set<AnimationCallback>();

let animationFrameId: number | null = null;
let lastFrameTime = 0;
let lastIsPlaying = false;
let unsubscribeTransport: (() => void) | null = null;

/**
 * Main animation frame tick
 * Runs only when isPlaying is true
 */
function tick(now: number) {
  const potatoMode = usePerformanceStore.getState().potatoMode;
  const frameInterval = potatoMode ? 1000 / 30 : 1000 / 60;

  // Throttle to target FPS
  if (now - lastFrameTime < frameInterval) {
    animationFrameId = requestAnimationFrame(tick);
    return;
  }

  const deltaTime = now - lastFrameTime;
  lastFrameTime = now;

  // Notify all subscribers
  listeners.forEach((callback) => {
    try {
      callback(now, deltaTime);
    } catch (error) {
      console.error("Error in playback animation callback:", error);
    }
  });

  animationFrameId = requestAnimationFrame(tick);
}

/**
 * Start the animation frame loop
 */
function startTicker(): void {
  if (animationFrameId !== null) return; // Already running

  lastFrameTime = performance.now();
  animationFrameId = requestAnimationFrame(tick);
}

/**
 * Stop the animation frame loop
 */
function stopTicker(): void {
  if (animationFrameId === null) return; // Already stopped

  cancelAnimationFrame(animationFrameId);
  animationFrameId = null;
  lastFrameTime = 0;
}

/**
 * Handle transport play/pause state changes
 */
function handlePlaybackStateChange(isPlaying: boolean): void {
  if (isPlaying === lastIsPlaying) return;
  lastIsPlaying = isPlaying;

  if (isPlaying && listeners.size > 0) {
    startTicker();
  } else if (!isPlaying) {
    stopTicker();
  }
}

/**
 * Ensure we're subscribed to transport state changes
 */
function ensureTransportSubscription(): void {
  if (unsubscribeTransport !== null) return;

  // Subscribe to transport store changes
  unsubscribeTransport = useTransportStore.subscribe((state) => {
    handlePlaybackStateChange(state.isPlaying);
  });

  // Initialize with current state
  const currentIsPlaying = useTransportStore.getState().isPlaying;
  handlePlaybackStateChange(currentIsPlaying);
}

/**
 * Cleanup transport subscription if no listeners remain
 */
function cleanupIfIdle(): void {
  if (listeners.size === 0) {
    stopTicker();
    if (unsubscribeTransport) {
      unsubscribeTransport();
      unsubscribeTransport = null;
    }
    lastIsPlaying = false;
  }
}

/**
 * Subscribe to playback animation frames
 *
 * Animation callbacks are only invoked when transport is playing.
 * When playback stops, all animation frames are automatically paused.
 *
 * @param callback - Function to invoke on each animation frame
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToPlaybackAnimation((now, deltaTime) => {
 *   // Update your animation state
 *   updateVisuals();
 * });
 *
 * // Later, cleanup
 * unsubscribe();
 * ```
 */
export function subscribeToPlaybackAnimation(
  callback: AnimationCallback,
): () => void {
  listeners.add(callback);
  ensureTransportSubscription();

  // If already playing, start ticker immediately
  const isPlaying = useTransportStore.getState().isPlaying;
  if (isPlaying && animationFrameId === null) {
    startTicker();
  }

  // Return unsubscribe function
  return () => {
    listeners.delete(callback);
    cleanupIfIdle();
  };
}

/**
 * Get current animation state (useful for debugging)
 */
export function getPlaybackAnimationState() {
  return {
    isRunning: animationFrameId !== null,
    listenerCount: listeners.size,
    isPlaying: lastIsPlaying,
  };
}
