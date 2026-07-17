/**
 * Decode dispatch tests for the current-version (2.1) rung: an unknown field
 * is stripped at load with a console warning (docs/preset-persistence.md,
 * decision 3), and a clean document decodes silently.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { init } from "@/core/dh";
import { decodePresetFileText } from "./decode";

/** A valid current-version (2.1) document as raw JSON-ready object. */
function validDocument(): Record<string, unknown> {
  return init() as unknown as Record<string, unknown>;
}

describe("decodePresetFileText - current-version strip warning", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads a clean v2.1 document without warning", () => {
    const document = decodePresetFileText(JSON.stringify(validDocument()));
    expect(document.version).toBe(2.1);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("strips a stray top-level key, still loads, and warns naming it", () => {
    const raw = { ...validDocument(), futureField: true };

    const document = decodePresetFileText(JSON.stringify(raw));

    expect(document.version).toBe(2.1);
    expect("futureField" in document).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("futureField");
  });

  it("strips and names a stray key inside a section", () => {
    const raw = validDocument();
    raw.master = { ...(raw.master as Record<string, unknown>), extraKnob: 1 };

    const document = decodePresetFileText(JSON.stringify(raw));

    expect("extraKnob" in (document.master as object)).toBe(false);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain("master.extraKnob");
  });
});
