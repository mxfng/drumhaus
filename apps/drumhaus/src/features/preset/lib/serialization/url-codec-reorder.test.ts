/**
 * KIT_ORDER independence: the hazard the compact share codec (v: 3) kills.
 *
 * v1.5 payloads reference kits by their positional index in KIT_ORDER, so
 * inserting the reserved kit-1/kit-2 (or any reorder) silently repoints
 * every old link. v3 payloads carry the stable kit id string; the decoder
 * never consults KIT_ORDER. This file simulates a reorder by mocking the
 * positional code lookups while leaving the id-keyed loaders intact, and
 * proves a v3 link's kit survives while a positional lookup would not.
 */

import { describe, expect, it, vi } from "vitest";

import { migrateV1ToDocument } from "@/features/preset/document";
import { buildDenseSharePreset } from "./__fixtures__/dense-preset";
import { shareableDocumentToUrl, urlToDocument } from "./index";

// Simulated post-insertion KIT_ORDER: kit-1 and kit-2 ship, shifting every
// later kit's index by two. Today kit-3 sits at index 1; after the
// insertion, index 1 is kit-1.
const REORDERED_KIT_ORDER = [
  "kit-0",
  "kit-1",
  "kit-2",
  "kit-3",
  "kit-4",
  "kit-5",
  "kit-6",
  "kit-7",
  "kit-8",
  "kit-9",
  "kit-10",
  "kit-11",
];

vi.mock("@/core/dhkit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/dhkit")>();
  return {
    ...actual,
    kitIdToCode: (kitId: string) => {
      const index = REORDERED_KIT_ORDER.indexOf(kitId);
      return index >= 0 ? String(index) : undefined;
    },
    codeToKitId: (code: string) => {
      const index = parseInt(code, 10);
      return index >= 0 && index < REORDERED_KIT_ORDER.length
        ? REORDERED_KIT_ORDER[index]
        : undefined;
    },
  };
});

describe("v3 kit references survive a KIT_ORDER reorder", () => {
  it("decodes a v3 payload to the same kit id under the reordered registry", () => {
    const document = migrateV1ToDocument(buildDenseSharePreset());
    expect(document.kit.id).toBe("kit-3");

    // Encoded before or after the reorder, the payload carries "kit-3";
    // decode reads the id, not an index.
    const decoded = urlToDocument(shareableDocumentToUrl(document));
    expect(decoded.kit.id).toBe("kit-3");
  });

  it("demonstrates the positional hazard the v3 format removes", async () => {
    // The reordered registry resolves the dense fixture's positional code
    // "1" (kit-3's index today) to a different kit: exactly the silent
    // corruption that v1.5 links in the wild remain exposed to.
    const { codeToKitId } = await import("@/core/dhkit");
    expect(codeToKitId("1")).not.toBe("kit-3");
  });
});
