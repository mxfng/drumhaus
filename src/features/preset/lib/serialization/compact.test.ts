/**
 * Share-URL codec tests for the retained v1.5 knob-space compact codec.
 *
 * The `v` field was introduced with the #269 swing retune; versionless
 * (pre-#269) payloads are no longer decoded here at all - urlToDocument
 * refuses them with UnsupportedVersionError before this decoder runs (see
 * url-codec.test.ts). v1.5 swing knob values pass through unchanged.
 */

import { describe, expect, it } from "vitest";

import { init } from "@/core/dh";
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
});
