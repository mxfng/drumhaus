/**
 * Browser regression tests for startTransport's pending-start supersession
 * (issue #440 review), against the REAL Tone transport.
 *
 * A scheduled aligned start can be superseded by a newer one inside the
 * lead window. The naive cancellation - Clock.stop(pendingInstant) - also
 * INSERTS a stopped event at that instant, and start/stop commands issued
 * for the new instant only cancel clock events at/after their own time, so
 * the stray stop survives:
 * - superseding with an EARLIER instant while stopped: the transport
 *   starts at the new instant, then permanently stops when the stray stop
 *   is reached - playback dies while every layer believes it is playing;
 * - superseding a scheduled realign with a LATER instant while running:
 *   the stray stop halts the grid at the old boundary and leaves silence
 *   until the new one.
 * Both were probe-confirmed against tone 15.5.25. startTransport now
 * cancels the pending events off the clock's state timeline instead
 * (tone-internals getTransportClockCancel), leaving no trace.
 */

import { getContext, getTransport, Sequence } from "tone/build/esm/index";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import {
  getNativeAudioContext,
  getTransportClockCancel,
  getTransportClockDispatchWatermark,
  getTransportClockTickMath,
} from "../tone-internals";
import {
  getCurrentTime,
  setTransportBpm,
  startTransport,
  stopTransport,
} from "../transport/transport";

/** Wait until the live context clock reaches the given absolute time. */
function untilContextTime(targetS: number, timeoutMs = 10_000): Promise<void> {
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (getCurrentTime() >= targetS) return resolve();
      if (performance.now() - startedAt > timeoutMs) {
        return reject(
          new Error(`context clock never reached ${targetS.toFixed(3)}s`),
        );
      }
      setTimeout(poll, 20);
    };
    poll();
  });
}

describe("startTransport pending-start supersession", () => {
  beforeAll(async () => {
    // Trusted user gesture so the AudioContext is allowed to start.
    await userEvent.click(document.body);
    await getContext().resume();
    expect(getContext().state).toBe("running");
  });

  afterEach(() => {
    stopTransport();
  });

  it("superseding with an EARLIER instant while stopped keeps playing past the old instant", async () => {
    // Warm prelude: a completed run, so the transport carries realistic
    // stop history (the #440 restart edges all live in that state).
    const warm = getCurrentTime();
    startTransport(warm + 0.05);
    await untilContextTime(warm + 0.3);
    stopTransport();
    await untilContextTime(warm + 0.45);

    const t = getCurrentTime();
    startTransport(t + 0.9); // pending aligned start
    startTransport(t + 0.45); // superseded by an EARLIER boundary

    // Past the SUPERSEDED instant (plus the transport's lookahead): with a
    // stray stop left at t+0.9 the transport is dead here; a clean
    // supersession keeps it running on the t+0.45 start.
    await untilContextTime(t + 1.2);
    expect(getTransport().state).toBe("started");
  }, 15_000);

  it("superseding a scheduled realign with a LATER instant leaves no silence gap", async () => {
    const t = getCurrentTime();
    startTransport(t + 0.05);
    await untilContextTime(t + 0.2);
    expect(getTransport().state).toBe("started");

    const base = getCurrentTime();
    startTransport(base + 0.7); // scheduled realign (running restart)
    startTransport(base + 1.4); // superseded by a LATER boundary

    // Inside (old boundary, new boundary): a stray stop at base+0.7 makes
    // this window silent; a clean supersession keeps the current run going
    // until the new boundary. Sampled with margin for the transport's
    // ~100ms lookahead on state reads.
    await untilContextTime(base + 0.95);
    expect(getCurrentTime()).toBeLessThan(base + 1.25);
    expect(getTransport().state).toBe("started");

    // And the new boundary itself starts: still running well past it.
    await untilContextTime(base + 1.6);
    expect(getTransport().state).toBe("started");
  }, 15_000);

  it("superseding a pending start inside the lookahead window fires no old-position ticks", async () => {
    // The last hole in the no-phantoms guarantee (#440 review): a pending
    // start that sits inside the transport's ~100ms lookahead but has NOT
    // been dispatched yet (its instant is above Clock._lastUpdate). With
    // the old now()-based "effectively begun" boundary, superseding it
    // with an earlier instant fell through to the stop path and fired the
    // TickSource resurrection branch once - phantom steps from the OLD
    // run's position, bounded by the lookahead. The dispatch-watermark
    // boundary cancels it cleanly instead.
    //
    // 600bpm makes a sixteenth 25ms, so the lookahead-sized phantom window
    // must contain at least one old-position tick if the branch fires.
    setTransportBpm(600);
    const sixteenthS = 60 / 600 / 4;
    const calls: { step: number; time: number }[] = [];
    const sequence = new Sequence(
      (time: number, step: number) => {
        calls.push({ step, time });
      },
      Array.from({ length: 16 }, (_, i) => i),
      "16n",
    );
    sequence.start(0);
    try {
      // Warm prelude: a completed run, so an old tick counter and a
      // completed stop exist for the resurrection branch to resurrect.
      const warm = getCurrentTime();
      startTransport(warm + 0.05);
      await untilContextTime(warm + 0.4);
      stopTransport();
      await untilContextTime(warm + 0.55);
      calls.length = 0;

      // Wait until the dispatch watermark has aged into a usable sliver:
      // 40-80ms behind transport.now(). Both instants below are placed
      // just ABOVE the watermark (undispatched - a start below it loses
      // its leading ticks by design, which the app's 150ms+ scheduling
      // margins never do) yet BELOW now()+lookahead, which is exactly the
      // window the old "effectively begun" boundary misclassified.
      // Everything after the poll is SYNCHRONOUS, so the watermark cannot
      // advance between reading it and issuing the two starts.
      await new Promise<void>((resolve, reject) => {
        const startedAt = performance.now();
        const poll = () => {
          const watermark = getTransportClockDispatchWatermark(getTransport());
          const age =
            watermark === undefined ? null : getTransport().now() - watermark;
          if (age !== null && age >= 0.04 && age <= 0.08) return resolve();
          if (performance.now() - startedAt > 5_000) {
            return reject(new Error("watermark never aged into the sliver"));
          }
          setTimeout(poll, 2);
        };
        poll();
      });
      const watermark = getTransportClockDispatchWatermark(getTransport())!;
      const rawNow = getContext().currentTime;
      const pendingAt = watermark + 0.03;
      const supersedeAt = watermark + 0.01; // EARLIER, still in the future
      expect(pendingAt).toBeLessThanOrEqual(getTransport().now());
      expect(supersedeAt).toBeGreaterThan(rawNow);
      startTransport(pendingAt);
      startTransport(supersedeAt);

      await untilContextTime(supersedeAt + 0.3);

      // Every callback in the window must sit on the NEW run's grid: step
      // k at supersedeAt + k sixteenths. A resurrected old-position tick
      // carries the old counter's step at an old-phase instant and cannot
      // satisfy this.
      const windowCalls = calls.filter((call) => call.time < supersedeAt + 0.3);
      expect(windowCalls.length).toBeGreaterThan(0);
      const offGrid = windowCalls.filter(
        (call) =>
          Math.abs(call.time - (supersedeAt + call.step * sixteenthS)) > 0.005,
      );
      expect(offGrid).toEqual([]);
      expect(windowCalls[0]?.step).toBe(0);
      expect(getTransport().state).toBe("started");
    } finally {
      stopTransport();
      sequence.stop();
      sequence.dispose();
      setTransportBpm(120);
    }
  }, 20_000);
});

describe("tone-internals accessor canary", () => {
  it("every transport/context reach-in resolves against the pinned Tone build", () => {
    // A Tone upgrade that changes these internal shapes must fail CI
    // deterministically here, not probabilistically in timing suites: the
    // accessors all degrade gracefully in production, so nothing else
    // would go loudly red.
    const transport = getTransport();

    const tickMath = getTransportClockTickMath(transport);
    expect(tickMath).toBeDefined();
    const probe = getCurrentTime() + 1;
    expect(
      tickMath!.getTimeOfTick(tickMath!.getTicksAtTime(probe)),
    ).toBeCloseTo(probe, 3);

    expect(getTransportClockCancel(transport)).toBeDefined();
    expect(getTransportClockDispatchWatermark(transport)).toBeTypeOf("number");

    const native = getNativeAudioContext(getContext().rawContext);
    expect(native).toBeInstanceOf(AudioContext);
    expect(typeof native?.getOutputTimestamp).toBe("function");
  });
});
