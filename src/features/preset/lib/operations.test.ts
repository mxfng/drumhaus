import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  encodePresetDocument,
  migrateV1ToDocument,
} from "@/features/preset/document";
import type { Meta } from "@/features/preset/types/meta";
import { getCurrentPreset } from "./helpers";
import { createPresetExportBlob } from "./operations";

// Store reads happen twice (once inside the blob, once for the expected
// value); freezing time keeps the stamped meta.updatedAt identical.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-14T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const presetMeta: Meta = {
  id: "export-test",
  name: "Export Test",
  createdAt: "2026-07-14T12:00:00.000Z",
  updatedAt: "2026-07-14T12:00:00.000Z",
};

const kitMeta: Meta = {
  id: "kit-0",
  name: "808",
  createdAt: "2023-11-20T16:00:00.000Z",
  updatedAt: "2025-12-12T05:59:26.188Z",
};

describe("createPresetExportBlob", () => {
  // The .dh export egress: snapshot() -> encode. The blob must be exactly
  // the v2 document encoding of the current store state.
  it("writes the v2 document snapshot of the current stores", async () => {
    const blob = createPresetExportBlob(presetMeta, kitMeta);

    expect(blob.type).toBe("application/octet-stream");

    const text = await blob.text();
    expect(text).toBe(
      encodePresetDocument(
        migrateV1ToDocument(getCurrentPreset(presetMeta, kitMeta)),
      ),
    );

    const raw = JSON.parse(text) as Record<string, unknown>;
    expect(raw.kind).toBe("drumhaus.preset");
    expect(raw.version).toBe(2.1);
    expect((raw.kit as { id: string }).id).toBe("kit-0");
    expect((raw.meta as Meta).id).toBe("export-test");
  });
});
