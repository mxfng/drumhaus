/**
 * Unit tests for the pre-intro reveal watchdog (issue #330): the reveal must
 * wait while resources are still arriving (heartbeat re-arms the quiet
 * timer), fire after loading silence, respect the hard ceiling, fire at most
 * once, and degrade to a plain timeout without PerformanceObserver.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { startRevealWatchdog } from "./reveal-watchdog";

/** PerformanceObserver stub; returns a trigger that fires all callbacks. */
function stubPerformanceObserver(): () => void {
  const callbacks: (() => void)[] = [];
  vi.stubGlobal(
    "PerformanceObserver",
    class {
      private callback: () => void;
      constructor(callback: () => void) {
        this.callback = callback;
      }
      observe() {
        callbacks.push(this.callback);
      }
      disconnect() {
        const index = callbacks.indexOf(this.callback);
        if (index !== -1) callbacks.splice(index, 1);
      }
    },
  );
  return () => callbacks.slice().forEach((callback) => callback());
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("startRevealWatchdog", () => {
  it("reveals after the quiet window when nothing is loading", () => {
    stubPerformanceObserver();
    const onReveal = vi.fn();
    startRevealWatchdog({ onReveal, quietMs: 3000, maxMs: 15000 });

    vi.advanceTimersByTime(2999);
    expect(onReveal).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("holds the reveal while resources keep arriving", () => {
    const heartbeat = stubPerformanceObserver();
    const onReveal = vi.fn();
    startRevealWatchdog({ onReveal, quietMs: 3000, maxMs: 15000 });

    // Assets arrive every 2s: each heartbeat re-arms the quiet timer.
    for (let i = 0; i < 3; i++) {
      vi.advanceTimersByTime(2000);
      heartbeat();
    }
    expect(onReveal).not.toHaveBeenCalled();

    // Loading goes silent: reveal fires one quiet window later.
    vi.advanceTimersByTime(3000);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("reveals at the hard ceiling even with constant loading activity", () => {
    const heartbeat = stubPerformanceObserver();
    const onReveal = vi.fn();
    startRevealWatchdog({ onReveal, quietMs: 3000, maxMs: 15000 });

    for (let i = 0; i < 7; i++) {
      vi.advanceTimersByTime(2000);
      heartbeat();
    }
    expect(onReveal).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("fires at most once", () => {
    stubPerformanceObserver();
    const onReveal = vi.fn();
    startRevealWatchdog({ onReveal, quietMs: 3000, maxMs: 15000 });

    vi.advanceTimersByTime(20000);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("does nothing after dispose", () => {
    const heartbeat = stubPerformanceObserver();
    const onReveal = vi.fn();
    const dispose = startRevealWatchdog({ onReveal, quietMs: 3000 });

    dispose();
    heartbeat();
    vi.advanceTimersByTime(20000);
    expect(onReveal).not.toHaveBeenCalled();
  });

  it("falls back to the quiet timeout without PerformanceObserver", () => {
    vi.stubGlobal("PerformanceObserver", undefined);
    const onReveal = vi.fn();
    startRevealWatchdog({ onReveal, quietMs: 3000, maxMs: 15000 });

    vi.advanceTimersByTime(3000);
    expect(onReveal).toHaveBeenCalledTimes(1);
  });
});
