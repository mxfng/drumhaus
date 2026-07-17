/**
 * Registry of the readable document version literals.
 *
 * The decode ladder (decode.ts) and the v1-family read helpers
 * (legacy-file-version.ts, file-v1.ts) reference this one list instead of
 * scattering bare literals, so the ladder is self-documenting and adding a
 * readable version is a single registry edit (#380,
 * docs/preset-versioning.md section 1). Every version
 * here is read-only ingress; the sole WRITABLE version is
 * PRESET_DOCUMENT_VERSION (document.ts), which stays the single source of
 * truth for "current".
 */

/**
 * The knob-space v1 `.dh` file family: v1 and v1.5 share one shape, and v1.5
 * marks the #269 swing retune (old curve: Tone swing = knob / 200; new curve:
 * knob * 0.00375). Read-only; migrated to canonical on load.
 */
const READABLE_V1_FILE_VERSIONS = [1, 1.5] as const;

/**
 * The version every readable v1-family file is normalized to on read (the
 * highest v1-family version). v1 files get the #269 swing knob migration to
 * reach it; v1.5 files already match. The fractional bump keeps version 2
 * reserved for the domain-unit preset document.
 */
const PRESET_FILE_VERSION = 1.5;

/**
 * The first domain document (#357), whose split filter was still a 0-100
 * position. Read-only; migrated to the canonical v2.1 on read.
 */
const READABLE_DOCUMENT_VERSION_V2 = 2;

export {
  PRESET_FILE_VERSION,
  READABLE_DOCUMENT_VERSION_V2,
  READABLE_V1_FILE_VERSIONS,
};
