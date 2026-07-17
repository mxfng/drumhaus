/**
 * Registry kit schema tests: every bundled `.dhkit` validates, and a malformed
 * kit fails typed at the same gate the registry loaders use.
 */

import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { getAllKits, kitCount } from "@/core/dhkit";
import { validateKitFile } from "./helpers";
import { kitFileSchema } from "./schema";

/** A minimal valid kit file with one canonical instrument. */
function makeKitFile() {
  return {
    kind: "drumhaus.kit",
    meta: {
      id: "kit-test",
      name: "Test Kit",
      createdAt: "2026-07-16T00:00:00.000Z",
      updatedAt: "2026-07-16T00:00:00.000Z",
    },
    instruments: [
      {
        meta: { id: "inst-0", name: "Kick" },
        role: "kick",
        sample: {
          meta: { id: "sample-0", name: "Kick" },
          path: "0/kick.wav",
          attribution: {
            status: "samplePack",
            label: "Roland TR-808",
            creditName: "Roland Corporation",
          },
        },
        params: {
          decay: 1.2,
          filter: { side: "highpass", cutoffHz: 0 },
          volume: -2,
          pan: 0,
          tune: 0,
          solo: false,
          mute: false,
        },
      },
    ],
  };
}

describe("kitFileSchema", () => {
  it("validates every bundled registry kit", () => {
    const kits = getAllKits();
    expect(kits).toHaveLength(kitCount);
    // getAllKits already parses each kit through validateKitFile; assert the
    // shape survived (canonical filter, roles) so a silent widening can't hide.
    for (const kit of kits) {
      expect(kit.kind).toBe("drumhaus.kit");
      expect(kit.instruments.length).toBeGreaterThan(0);
      for (const instrument of kit.instruments) {
        expect(instrument.params.filter).toHaveProperty("side");
        expect(instrument.params.filter).toHaveProperty("cutoffHz");
      }
    }
  });

  it("parses a minimal valid kit file", () => {
    expect(() => validateKitFile(makeKitFile())).not.toThrow();
  });

  it("rejects a non-object with a ZodError", () => {
    expect(() => validateKitFile(null)).toThrow(ZodError);
    expect(() => validateKitFile("not a kit")).toThrow(ZodError);
  });

  it("rejects the wrong kind", () => {
    const kit = { ...makeKitFile(), kind: "drumhaus.preset" };
    expect(() => validateKitFile(kit)).toThrow(ZodError);
  });

  it("rejects an out-of-range pan", () => {
    const kit = makeKitFile();
    kit.instruments[0].params.pan = 5;
    expect(() => validateKitFile(kit)).toThrow(ZodError);
  });

  it("rejects an unknown instrument role", () => {
    const kit = makeKitFile();
    (kit.instruments[0] as { role: string }).role = "vocals";
    expect(() => validateKitFile(kit)).toThrow(ZodError);
  });

  it("rejects a non-canonical (scalar) filter", () => {
    const kit = makeKitFile();
    (kit.instruments[0].params as { filter: unknown }).filter = 50;
    expect(() => kitFileSchema.parse(kit)).toThrow(ZodError);
  });
});
