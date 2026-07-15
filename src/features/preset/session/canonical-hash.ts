/**
 * Content hash of a preset document, the basis of reload-stable dirty
 * tracking and the session envelope's clean baseline
 * (docs/preset-persistence.md, "Session storage: the document replaces five
 * persists": dirty tracking becomes a persisted content hash of the last
 * clean document).
 *
 * Two stability traps shape the canonical form:
 *
 * 1. Float noise. After applyPresetDocument, a fresh snapshotPresetDocument
 *    differs from the applied document by knob<->domain round-trip noise:
 *    the apply path crosses domain -> knob (live inverses in
 *    domain-to-knob.ts) and the snapshot path crosses knob -> domain (the
 *    frozen v1 curves, identical to the live curves today), leaving pure
 *    float-arithmetic error of ~1e-12 absolute on these magnitudes. Every
 *    number is therefore rounded to 9 decimal places before hashing.
 *    Derivation of the 9: the noise floor sits around 1e-12, three orders
 *    below the 5e-10 rounding threshold, while the smallest real edit - a
 *    0.1 knob step on the flattest mapping in the app, master compAttack at
 *    the bottom of its exponential curve - moves the domain value by
 *    (0.1/100)^2 * 0.099 s ~= 9.9e-8 s, two orders above it. (Coarser
 *    mappings move by >1e-5 per knob step.) Both margins are pinned in
 *    canonical-hash.test.ts.
 *
 * 2. Timestamps. getCurrentPreset mints a fresh meta.updatedAt on every
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

/** See the module comment for the derivation of this precision. */
const CANONICAL_DECIMALS = 9;
const CANONICAL_SCALE = 10 ** CANONICAL_DECIMALS;

function canonicalizeNumber(value: number): number {
  // The document schema forbids non-finite numbers; pass them through
  // rather than crash if one ever leaks in (JSON spells them "null").
  if (!Number.isFinite(value)) return value;
  return Math.round(value * CANONICAL_SCALE) / CANONICAL_SCALE;
}

/** Round every number and sort every key, recursively. */
function canonicalize(value: unknown): unknown {
  if (typeof value === "number") return canonicalizeNumber(value);
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
