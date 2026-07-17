/**
 * Bridge rollback tests for kit-load failure (decision 5 in
 * docs/preset-persistence.md).
 *
 * Drives subscribeKitToEngine against the real instruments store and a
 * stub engine (the rollback logic is store orchestration; the engine's own
 * failure semantics are covered by the engine browser tests). A failed
 * store-driven load must roll the store back to the previous instruments
 * and fire the kit-load-failure event exactly once, and a rollback whose
 * own redundant load also fails must not loop.
 */

import { afterEach, describe, expect, it } from "vitest";

import type {
  KitLoadResult,
  KitSampleDescriptor,
} from "@/core/audio/engine/audio-engine";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import { makeInstrument } from "@/test/fixtures";
import { onKitLoadFailure, subscribeKitToEngine } from "./kit-subscription";

/** Stub engine recording every loadKit call; outcome decided per kit. */
function makeStubEngine(
  resultFor: (kit: KitSampleDescriptor[]) => KitLoadResult,
) {
  const calls: KitSampleDescriptor[][] = [];
  return {
    calls,
    loadKit: (kit: KitSampleDescriptor[]) => {
      calls.push(kit);
      return Promise.resolve(resultFor(kit));
    },
  };
}

/** Whether every descriptor in the kit belongs to these instruments. */
function isKitOf(kit: KitSampleDescriptor[], instruments: InstrumentData[]) {
  const ids = new Set(instruments.map((instrument) => instrument.meta.id));
  return kit.every((slot) => ids.has(slot.instrumentId));
}

/** Drains the loadKit -> rollback -> redundant loadKit microtask chains. */
async function flushKitLoads(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});

describe("kit subscription rollback (decision 5)", () => {
  it("rolls the store back on failure and fires the failure event once", async () => {
    const goodKit = [makeInstrument(0, "kick"), makeInstrument(1, "snare")];
    const badKit = [makeInstrument(2, "kick"), makeInstrument(3, "snare")];
    useInstrumentsStore.getState().setAllInstruments(goodKit);

    const engine = makeStubEngine((kit) =>
      isKitOf(kit, badKit) ? "failed" : "loaded",
    );
    cleanups.push(subscribeKitToEngine(engine));

    let failures = 0;
    cleanups.push(
      onKitLoadFailure(() => {
        failures += 1;
      }),
    );

    // Commit the bad kit, exactly like a kit/preset switch does.
    useInstrumentsStore.getState().setAllInstruments(badKit);
    await flushKitLoads();

    // Rolled back to the exact previous instruments value.
    expect(useInstrumentsStore.getState().instruments).toBe(goodKit);
    expect(failures).toBe(1);

    // Loads: initial good kit, the failed bad kit, then the rollback's
    // redundant reload of the good kit (harmless - the engine holds it).
    expect(engine.calls).toHaveLength(3);
    expect(isKitOf(engine.calls[1], badKit)).toBe(true);
    expect(isKitOf(engine.calls[2], goodKit)).toBe(true);
  });

  it("does not loop when the rollback's own load also fails", async () => {
    const goodKit = [makeInstrument(0, "kick"), makeInstrument(1, "snare")];
    const badKit = [makeInstrument(2, "kick"), makeInstrument(3, "snare")];
    useInstrumentsStore.getState().setAllInstruments(goodKit);

    // Every load fails (e.g. the network died entirely).
    const engine = makeStubEngine(() => "failed");
    cleanups.push(subscribeKitToEngine(engine));

    let failures = 0;
    cleanups.push(
      onKitLoadFailure(() => {
        failures += 1;
      }),
    );

    useInstrumentsStore.getState().setAllInstruments(badKit);
    await flushKitLoads();
    await flushKitLoads();

    // The bad kit rolled back once; the rollback's own failed load hit the
    // loop guard: no second rollback, no second event, no further loads.
    expect(useInstrumentsStore.getState().instruments).toBe(goodKit);
    expect(failures).toBe(1);
    // Initial load, the bad kit, the rollback reload - and nothing after.
    expect(engine.calls).toHaveLength(3);
  });

  it("leaves the store alone when loads succeed or are superseded", async () => {
    const kitA = [makeInstrument(0, "kick"), makeInstrument(1, "snare")];
    const kitB = [makeInstrument(2, "kick"), makeInstrument(3, "snare")];
    useInstrumentsStore.getState().setAllInstruments(kitA);

    const engine = makeStubEngine((kit) =>
      isKitOf(kit, kitB) ? "loaded" : "superseded",
    );
    cleanups.push(subscribeKitToEngine(engine));

    let failures = 0;
    cleanups.push(
      onKitLoadFailure(() => {
        failures += 1;
      }),
    );

    useInstrumentsStore.getState().setAllInstruments(kitB);
    await flushKitLoads();

    expect(useInstrumentsStore.getState().instruments).toBe(kitB);
    expect(failures).toBe(0);
  });
});
