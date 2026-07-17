import { useCallback, useSyncExternalStore } from "react";

import { getAudioEngine } from "@/core/audio/engine";

/**
 * Module-level kit version, bumped on every engine kit-loaded event. Shared
 * across all subscribers via one engine subscription, so late mounts see the
 * current version (> 0 once any kit has loaded).
 */
let kitVersion = 0;
const listeners = new Set<() => void>();
let unsubscribeEngine: (() => void) | null = null;

function subscribeToKitLoads(listener: () => void): () => void {
  if (!unsubscribeEngine) {
    unsubscribeEngine = getAudioEngine().onKitLoaded(() => {
      kitVersion += 1;
      listeners.forEach((notify) => notify());
    });
  }

  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && unsubscribeEngine) {
      unsubscribeEngine();
      unsubscribeEngine = null;
    }
  };
}

function getKitVersionSnapshot(): number {
  return kitVersion;
}

/**
 * Subscribes to engine kit-loaded events and returns a counter that bumps on
 * every successful kit load. Use the returned value directly (e.g. as a
 * loading gate or a remount key); to refresh an engine read after kit swaps,
 * use useChannelReady instead - reading engine state at render keyed off a
 * discarded version value gets memoized away by the React Compiler.
 */
function useKitVersion(): number {
  return useSyncExternalStore(subscribeToKitLoads, getKitVersionSnapshot);
}

/**
 * Whether the channel at this index exists and has finished loading its
 * sample, re-read on every kit load. The engine read lives inside the
 * external-store snapshot so React (and the React Compiler) treat it as
 * subscribed state rather than a memoizable render-time computation.
 */
function useChannelReady(index: number): boolean {
  const getSnapshot = useCallback(
    () => getAudioEngine().isChannelReady(index),
    [index],
  );
  return useSyncExternalStore(subscribeToKitLoads, getSnapshot);
}

export { useChannelReady, useKitVersion };
