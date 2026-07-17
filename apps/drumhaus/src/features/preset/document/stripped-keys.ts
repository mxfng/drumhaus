/**
 * Shared "strip at load with a warning" helper (docs/preset-persistence.md,
 * decision 3). A strip-mode `z.object` parse silently drops keys the schema
 * does not declare; this collects those key paths so the read path can warn
 * about them instead of dropping them in silence.
 *
 * Neutral by design: it knows nothing about any particular schema. Each caller
 * supplies, per section, the raw value to inspect, a dot-path prefix, and the
 * keys that section's schema declares. That lets both the legacy v1 reader
 * (file-v1.ts, inside the frozen legacy-read island) and the current-version
 * document reader (decode.ts / migrate-v2.ts, live code) share this without
 * either importing the other, and it outlives the eventual sunset of the v1
 * island because it depends on neither side.
 */

type StrippedSection = {
  /** The raw object whose keys are checked; non-objects/arrays are skipped. */
  readonly value: unknown;
  /** Dot-path prefix for reported keys ("" for the envelope root). */
  readonly prefix: string;
  /** The keys this section's schema declares; anything else is reported. */
  readonly knownKeys: readonly string[];
};

/**
 * Collect the dot-paths of keys a strip-mode parse will drop, across the given
 * sections. Only the levels a caller lists are inspected; nested loose objects
 * and array/tuple internals are the caller's concern.
 */
function collectStrippedKeyPaths(
  sections: readonly StrippedSection[],
): string[] {
  const stripped: string[] = [];
  for (const { value, prefix, knownKeys } of sections) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      continue;
    }
    for (const key of Object.keys(value)) {
      if (!knownKeys.includes(key)) {
        stripped.push(prefix ? `${prefix}.${key}` : key);
      }
    }
  }
  return stripped;
}

/**
 * Emit a single console warning naming the stripped key paths, or nothing when
 * none were stripped. `kind` labels the payload (e.g. "Preset file", "Preset
 * document") so the read paths share one message format.
 */
function warnStrippedKeyPaths(kind: string, strippedPaths: string[]): void {
  if (strippedPaths.length > 0) {
    console.warn(
      `${kind} contains unknown fields (stripped): ${strippedPaths.join(", ")}`,
    );
  }
}

export { collectStrippedKeyPaths, warnStrippedKeyPaths };
export type { StrippedSection };
