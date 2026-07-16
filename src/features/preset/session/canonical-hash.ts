/**
 * Content hash of a preset document, the basis of reload-stable dirty
 * tracking and the session envelope's clean baseline
 * (docs/preset-persistence.md, "Session storage: the document replaces five
 * persists": dirty tracking becomes a persisted content hash of the last
 * clean document).
 *
 * Two stability concerns shape the canonical form:
 *
 * 1. No float floor is needed. The stores hold canonical units, so
 *    applyPresetDocument writes the document's numbers directly and
 *    snapshotPresetDocument reads them back unchanged (field renames only, no
 *    arithmetic); JSON preserves IEEE-754 doubles exactly. The
 *    apply -> snapshot round trip is therefore a bit-exact identity, and the
 *    hash can compare raw numbers - the old 9-decimal rounding that absorbed
 *    knob<->domain round-trip noise is obsolete and gone. The
 *    smallest-real-edit margin is still pinned in canonical-hash.test.ts as a
 *    guard.
 *
 * 2. Timestamps. snapshotPresetDocument mints a fresh meta.updatedAt on every
 *    call, so two snapshots of identical musical state differ only there;
 *    the canonical form excludes meta.updatedAt, mirroring what the old
 *    JSON-comparing hasUnsavedChanges stripped for the same reason.
 *
 * Key order: documents always come out of presetDocumentSchema.parse, which
 * rebuilds objects in schema-declaration order, so their JSON key order is
 * already deterministic; canonicalization still sorts keys so the hash can
 * never depend on an object's construction path.
 *
 * The hash itself is FNV-1a 32-bit over the canonical JSON string: cheap,
 * synchronous, dependency-free, and collision-resistant enough for a
 * "did the user edit anything" comparison (no adversarial inputs).
 */

import type { PresetDocument } from "@/features/preset/document";

/** Sort every key, recursively; numbers pass through bit-exact (see above). */
function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = canonicalize(source[key]);
    }
    return result;
  }
  return value;
}

/** FNV-1a 32-bit over UTF-16 code units, as 8 hex digits. */
function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/**
 * Hash a preset document's musical content. Stable across apply -> snapshot
 * round trips and fresh meta.updatedAt stamps; sensitive to any real edit.
 */
function hashPresetDocument(document: PresetDocument): string {
  const { updatedAt: _updatedAt, ...meta } = document.meta;
  return fnv1a32(JSON.stringify(canonicalize({ ...document, meta })));
}

export { hashPresetDocument };
