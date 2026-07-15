/**
 * Share-URL codec tests for the #269 swing retune.
 *
 * The compact codec was unversioned before the retune; the `v` field now
 * marks post-retune URLs. Decoding must treat a missing `v` as a legacy
 * URL whose `sw` value (or implied default, when omitted) is in the OLD
 * swing knob space and rescale it, while `v: 1.5` URLs pass through.
 */

import { describe, expect, it } from "vitest";

import { init } from "@/core/dh";
import type { CompactPreset } from "./compact";
import { decodePreset } from "./decode";
import { encodePreset } from "./encode";

function makePresetWithSwing(swing: number) {
  const preset = init();
  preset.transport.swing = swing;
  return preset;
}

describe("compact codec versioning (#269)", () => {
  it("stamps encoded presets with codec version 1.5", () => {
    const compact = encodePreset(makePresetWithSwing(0));
    expect(compact.v).toBe(1.5);
  });

  it("round-trips a post-retune swing value unchanged", () => {
    const compact = encodePreset(makePresetWithSwing(64));
    expect(compact.sw).toBe(64);

    const decoded = decodePreset(compact);
    expect(decoded.version).toBe(1.5);
    expect(decoded.transport.swing).toBe(64);
  });

  it("omits sw at the init default and still decodes to it", () => {
    const compact = encodePreset(makePresetWithSwing(0));
    expect(compact.sw).toBeUndefined();

    expect(decodePreset(compact).transport.swing).toBe(0);
  });

  it("migrates a legacy URL's swing from the old knob space", () => {
    const compact = encodePreset(makePresetWithSwing(48));
    delete compact.v; // Simulate a pre-retune URL: unversioned, old space.

    const decoded = decodePreset(compact);
    expect(decoded.version).toBe(1.5);
    expect(decoded.transport.swing).toBe(64);
  });

  it("clamps a legacy URL's swing above 75 to knob 100", () => {
    const compact = encodePreset(makePresetWithSwing(90));
    delete compact.v;

    expect(decodePreset(compact).transport.swing).toBe(100);
  });

  it("decodes a legacy URL with omitted swing to straight time", () => {
    const compact: CompactPreset = encodePreset(makePresetWithSwing(0));
    delete compact.v;
    expect(compact.sw).toBeUndefined();

    expect(decodePreset(compact).transport.swing).toBe(0);
  });
});
