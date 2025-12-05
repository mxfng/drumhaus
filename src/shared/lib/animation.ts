import { usePerformanceStore } from "@/shared/store/usePerformanceStore";

/**
 * Callback invoked on each animation frame
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

/**
 * Main animation frame tick
 * Runs continuously while there are active listeners
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
 * Stop ticker if no listeners remain
 */
function cleanupIfIdle(): void {
  if (listeners.size === 0) {
    stopTicker();
  }
}

/**
 * Subscribe to playback animation frames
 *
 * Animation callbacks run continuously while subscribed, allowing meters
 * and visualizations to animate naturally even when transport is paused.
 * This ensures feedback for preview sounds and smooth decay animations.
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

  // Start ticker if this is the first listener
  if (animationFrameId === null) {
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
  };
}
