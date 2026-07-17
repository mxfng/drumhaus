/**
 * Unit tests for the kit descriptor mapping and the early-exit tuple compare
 * that keys kit reloads in the bridge.
 */

import { describe, expect, it } from "vitest";

import type { InstrumentRole } from "@/core/audio/engine/instrument/types";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import {
  kitDescriptorsChanged,
  toKitSampleDescriptors,
} from "./kit-descriptors";

function makeInstrument(
  id: string,
  path: string,
  role: InstrumentRole,
): InstrumentData {
  return {
    meta: { id, name: id },
    role,
    sample: { meta: { id: `${id}-sample`, name: path }, path },
    params: {
      decay: 0.5,
      filter: { side: "lowpass", cutoffHz: 15000 },
      volume: 0,
      pan: 0,
      tune: 0,
      solo: false,
      mute: false,
    },
  };
}

const instruments = [
  makeInstrument("kick-a", "kicks/a.wav", "kick"),
  makeInstrument("hat-a", "hats/a.wav", "hat"),
];

describe("toKitSampleDescriptors", () => {
  it("maps instrument id, sample path, and role per slot", () => {
    expect(toKitSampleDescriptors(instruments)).toEqual([
      { instrumentId: "kick-a", samplePath: "kicks/a.wav", role: "kick" },
      { instrumentId: "hat-a", samplePath: "hats/a.wav", role: "hat" },
    ]);
  });
});

describe("kitDescriptorsChanged", () => {
  const kit = toKitSampleDescriptors(instruments);

  it("reports no change for the same descriptor tuples", () => {
    expect(kitDescriptorsChanged(kit, instruments)).toBe(false);
  });

  it("ignores params-only changes (a volume edit)", () => {
    const tweaked = instruments.map((instrument) => ({
      ...instrument,
      params: { ...instrument.params, volume: -12 },
    }));
    expect(kitDescriptorsChanged(kit, tweaked)).toBe(false);
  });

  it("detects a role-only change", () => {
    const rechoked = [
      instruments[0],
      { ...instruments[1], role: "ohat" as const },
    ];
    expect(kitDescriptorsChanged(kit, rechoked)).toBe(true);
  });

  it("detects an instrument id change without a path change", () => {
    const renamed = [
      { ...instruments[0], meta: { id: "kick-b", name: "kick-b" } },
      instruments[1],
    ];
    expect(kitDescriptorsChanged(kit, renamed)).toBe(true);
  });

  it("detects a sample path change", () => {
    const swapped = [
      instruments[0],
      makeInstrument("hat-a", "hats/b.wav", "hat"),
    ];
    expect(kitDescriptorsChanged(kit, swapped)).toBe(true);
  });

  it("detects added and removed instruments", () => {
    expect(kitDescriptorsChanged(kit, instruments.slice(0, 1))).toBe(true);
    expect(
      kitDescriptorsChanged(kit, [
        ...instruments,
        makeInstrument("perc-a", "percs/a.wav", "perc"),
      ]),
    ).toBe(true);
  });

  it("distinguishes paths a comma-joined string key would conflate", () => {
    // "a,b" + "c" and "a" + "b,c" both join to "a,b,c"
    const kitWithComma = toKitSampleDescriptors([
      makeInstrument("one", "a,b", "kick"),
      makeInstrument("two", "c", "hat"),
    ]);
    const conflated = [
      makeInstrument("one", "a", "kick"),
      makeInstrument("two", "b,c", "hat"),
    ];
    expect(kitDescriptorsChanged(kitWithComma, conflated)).toBe(true);
  });
});
