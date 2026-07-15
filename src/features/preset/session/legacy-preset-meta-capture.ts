/**
 * Capture point for the preset-meta fields retired from persistence in
 * PR 5 (currentPresetMeta/currentKitMeta now restore via the session
 * document).
 *
 * WHY THIS EXISTS: the legacy drumhaus-preset-meta-storage envelope is
 * consumed and DELETED by the library adoption
 * (features/preset/library/adoption.ts), which runs at the top of
 * bootstrapSession - before the session ladder decides whether the one-time
 * legacy SESSION adoption needs the currentPresetMeta/currentKitMeta fields
 * that pre-PR 5 envelopes still carry. The library adoption therefore hands
 * those fields to this module on their way out, and the session adopter
 * reads them from here instead of from storage. (In PR 5 the same duty was
 * performed by the store's persist migrate, which narrowed the envelope to
 * { customPresets }; the persist is gone now that the library owns its own
 * storage.)
 *
 * Deliberately import-free of stores so the library adoption and the
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
 * Called by the library adoption with the legacy envelope's state, before
 * the envelope is retired. Malformed fields capture as undefined; the
 * session adopter then falls back to init()'s meta.
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
