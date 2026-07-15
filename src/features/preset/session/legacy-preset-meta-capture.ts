/**
 * Capture point for the preset-meta fields retired from persistence in
 * PR 5 (currentPresetMeta/currentKitMeta now restore via the session
 * document).
 *
 * WHY THIS EXISTS: zustand's persist middleware writes the migrated state
 * back to storage as soon as a version-bumped store hydrates, which happens
 * synchronously at module import - BEFORE bootstrapSession() runs. That
 * write-back narrows the drumhaus-preset-meta-storage envelope to
 * { customPresets }, destroying the very meta fields the one-time legacy
 * adopter needs to know which preset and kit the user had loaded. The
 * store's migrate function therefore hands the dropped fields to this
 * module on their way out, and the adopter reads them from here instead of
 * from storage.
 *
 * Deliberately import-free of stores so both the preset-meta store and the
 * session bootstrap can depend on it without cycles.
 */

import type { Meta } from "@/features/preset/types/meta";

/** Matches migrate-v1.ts's stand-in for missing/untyped v1 timestamps. */
const TIMESTAMP_SENTINEL = "1970-01-01T00:00:00.000Z";

interface CapturedLegacyPresetMeta {
  currentPresetMeta: Meta | undefined;
  currentKitMeta: Meta | undefined;
}

let captured: CapturedLegacyPresetMeta | null = null;

function asMeta(value: unknown): Meta | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = value as Record<string, unknown>;
  if (typeof raw.id !== "string" || typeof raw.name !== "string") {
    return undefined;
  }
  return {
    id: raw.id,
    name: raw.name,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : TIMESTAMP_SENTINEL,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : TIMESTAMP_SENTINEL,
    ...(typeof raw.author === "string" ? { author: raw.author } : {}),
  };
}

/**
 * Called by the preset-meta store's persist migrate with the pre-narrowing
 * persisted state. Malformed fields capture as undefined; the adopter then
 * falls back to init()'s meta.
 */
function captureLegacyPresetMeta(persistedState: unknown): void {
  if (typeof persistedState !== "object" || persistedState === null) return;
  const state = persistedState as Record<string, unknown>;
  captured = {
    currentPresetMeta: asMeta(state.currentPresetMeta),
    currentKitMeta: asMeta(state.currentKitMeta),
  };
}

/** null when no legacy (pre-v2) preset-meta envelope hydrated this boot. */
function getCapturedLegacyPresetMeta(): CapturedLegacyPresetMeta | null {
  return captured;
}

export { captureLegacyPresetMeta, getCapturedLegacyPresetMeta };
export type { CapturedLegacyPresetMeta };
