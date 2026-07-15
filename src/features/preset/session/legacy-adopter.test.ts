/**
 * Unit tests for the legacy persist replays: the retired per-store zustand
 * migrations now live in legacy-adopter.ts, and their semantics are pinned
 * here where they used to be pinned next to the stores (the #269 transport
 * swing cases move over verbatim from the deleted
 * use-transport-store.persist.test.ts).
 *
 * End-to-end adoption (assemble -> apply -> session write -> key deletion)
 * is covered by bootstrap.test.ts.
 */

import { describe, expect, it } from "vitest";

import { loadKit } from "@/core/dhkit";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import {
  replayInstrumentsEnvelope,
  replayMasterChainEnvelope,
  replaySequencerEnvelope,
  replayTransportEnvelope,
} from "./legacy-adopter";

describe("replayTransportEnvelope (#269 swing retune, formerly persist v0 -> v1)", () => {
  it("rescales a version-0 swing knob value by 4/3", () => {
    const result = replayTransportEnvelope({
      state: { bpm: 128, swing: 48 },
      version: 0,
    });

    expect(result.bpm).toBe(128);
    expect(result.swing).toBe(64);
  });

  it("clamps a version-0 swing above 75 to knob 100", () => {
    const result = replayTransportEnvelope({
      state: { bpm: 120, swing: 90 },
      version: 0,
    });

    expect(result.swing).toBe(100);
  });

  it("leaves version-1 state untouched", () => {
    const result = replayTransportEnvelope({
      state: { bpm: 120, swing: 64 },
      version: 1,
    });

    expect(result.swing).toBe(64);
  });

  it("defaults missing fields like the old store initializer merge", () => {
    const result = replayTransportEnvelope({ state: {}, version: 1 });

    expect(result).toEqual({ bpm: 100, swing: 0 });
  });
});

describe("replayInstrumentsEnvelope (formerly persist v1 -> v2)", () => {
  function v1Era(instruments: InstrumentData[]): InstrumentData[] {
    // Rewind a modern kit's params to the release/pitch/attack era.
    return instruments.map((inst) => {
      const { decay, tune, ...rest } = inst.params;
      return {
        ...inst,
        params: {
          ...rest,
          attack: 0,
          release: decay,
          pitch: tune,
        } as unknown as InstrumentData["params"],
      };
    });
  }

  it("renames release -> decay and pitch -> tune, dropping attack", () => {
    const modern = loadKit("kit-0")!.instruments;
    const legacy = v1Era(modern);
    legacy[0].params = {
      ...legacy[0].params,
      release: 63,
      pitch: 41,
    } as unknown as InstrumentData["params"];

    const replayed = replayInstrumentsEnvelope({
      state: { instruments: legacy },
      version: 1,
    });

    expect(replayed[0].params.decay).toBe(63);
    expect(replayed[0].params.tune).toBe(41);
    expect("release" in replayed[0].params).toBe(false);
    expect("pitch" in replayed[0].params).toBe(false);
    expect("attack" in replayed[0].params).toBe(false);
  });

  it("passes version-2 instruments through untouched", () => {
    const modern = loadKit("kit-0")!.instruments;

    const replayed = replayInstrumentsEnvelope({
      state: { instruments: modern },
      version: 2,
    });

    expect(replayed).toBe(modern);
  });

  it("throws on an envelope without an instruments array", () => {
    expect(() =>
      replayInstrumentsEnvelope({ state: {}, version: 2 }),
    ).toThrow();
  });
});

describe("replaySequencerEnvelope (formerly persist migrate v3)", () => {
  it("converts the legacy variationCycle to a chain", () => {
    const result = replaySequencerEnvelope({
      state: { variationCycle: "AB", variation: 0 },
      version: 1,
    });

    expect(result.chain.steps).toEqual([
      { variation: 0, repeats: 1 },
      { variation: 1, repeats: 1 },
    ]);
    expect(result.chainEnabled).toBe(true);
  });

  it("keeps a modern chain and clamps the selected variation", () => {
    const result = replaySequencerEnvelope({
      state: {
        variation: 9,
        chain: { steps: [{ variation: 2, repeats: 3 }] },
        chainEnabled: true,
      },
      version: 3,
    });

    expect(result.variation).toBe(3);
    expect(result.chain.steps).toEqual([{ variation: 2, repeats: 3 }]);
    expect(result.chainEnabled).toBe(true);
  });

  it("throws on a corrupt pattern instead of degrading to an empty one", () => {
    // The old store migrate caught this and rehydrated an empty pattern;
    // the adopter deliberately fails the whole adoption so every legacy key
    // is preserved for recovery.
    expect(() =>
      replaySequencerEnvelope({ state: { pattern: 42 }, version: 3 }),
    ).toThrow();
  });
});

describe("replayMasterChainEnvelope (formerly unversioned persist)", () => {
  it("lands persisted fields over the store defaults", () => {
    const result = replayMasterChainEnvelope({
      state: { filter: 25, reverb: 33 },
      version: 0,
    });

    expect(result.filter).toBe(25);
    expect(result.reverb).toBe(33);
    // Untouched fields keep the initializer defaults (spot checks).
    expect(result.compMix).toBe(70);
    expect(result.masterVolume).toBe(92);
  });
});
