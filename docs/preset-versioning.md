# Preset document versioning policy

This is the living policy for how the `.dh` preset document and the share-link compact codec are versioned, migrated, and eventually sunset.
It was written from a read-only audit of every version surface (#362) after the domain-representation flip (#357) landed at document version 2.1.
Where docs/preset-persistence.md describes the design as it was planned, this doc describes the versioning rules as they actually shipped and must be kept true to the code.

## Three separate version namespaces

There is not one "version" in this system; there are three, and conflating them is the main source of confusion.

1. The document version: the `version` field of a `.dh` file / `PresetDocument`.
   Single source of truth is `PRESET_DOCUMENT_VERSION` in `src/features/preset/document/document.ts` (currently `2.1`).
2. The compact codec version: the `v` field of a `?p=` share payload.
   Source is `COMPACT_CODEC_VERSION` in `src/features/preset/lib/serialization/compact-v2.ts` (currently `2`), with a retained `1.5` decoder in `compact.ts`.
   This is a codec version, NOT the document version, and the two have already diverged (see Findings).
3. The Zustand persist-envelope version: the integer `version` on the retired `drumhaus-preset-meta-storage` localStorage blob.
   Read only by `src/features/preset/library/adoption.ts` (the `version < 2` capture gate) during one-time library adoption.
   It is a store-migration concern and never a document version; it is listed here only so it is not mistaken for one.

The rest of this doc is about namespaces 1 and 2.

## 1. Canonical version list: readable vs writable

Document versions (the `version` field of a `.dh` file / `PresetDocument`):

| version | shape | readable | writable | notes |
|---------|-------|----------|----------|-------|
| 1 | knob-space file (0-100 positions) | yes | no | legacy `.dh`; migrates 1 -> 1.5 swing on read (`migrate.ts`), then 1.x -> 2.1 (`migrate-v1.ts`) |
| 1.5 | knob-space file | yes | no | #269 swing retune; identical shape to v1 |
| 2 | first domain document | yes | no | domain-space except the split filter, still a 0-100 position; migrates 2 -> 2.1 (`migrate-v2.ts`) |
| 2.1 | canonical domain document | yes | yes | current; split filter is canonical `{ side, cutoffHz }`; the only writable version |
| anything else | - | no | no | hard-refused with `UnsupportedVersionError` (decision 2) |

Compact share-codec versions (the `v` field of a `?p=` payload; a separate namespace):

| `v` | codec | readable | written | notes |
|-----|-------|----------|---------|-------|
| absent | pre-#269 versionless | no | no | refused with `UnsupportedVersionError` (decision 4) |
| 1.5 | knob-space compact (`compact.ts`) | yes | no | decodes via `validatePresetFileV1` + `migrateV1ToDocument`, same ladder as v1.x file imports |
| 2 | v2 document compact (`compact-v2.ts`) | yes | yes | the only outbound codec; carries a canonical (v2.1) payload despite the `v: 2` label (see Findings) |

The rule in one line: every document version is readable and only the highest (`2.1`) is writable; egress never downgrades.

Where each is read or written:

- Read dispatch (documents): `decode.ts` `decodePresetObject` routes `1`/`1.5` -> `migrateV1ToDocument(validatePresetFileV1(...))`, `2` -> `migrateV2ToDocument`, `2.1` -> strict `presetDocumentSchema` parse, else `UnsupportedVersionError`.
  The version is dispatched BEFORE the strict parse so a v2 position-filter can never be mis-read as a v2.1 canonical filter.
- Read dispatch (shares): `serialization/index.ts` `urlToDocument` routes `v: 2` -> `decodeCompactDocument`, `v: 1.5` -> `compact.ts` -> `migrateV1ToDocument`, else refuse.
- v1-family reader: `parse.ts` + `file-v1.ts` (tolerant schema) + `migrate.ts` (`isReadablePresetFileVersion`, `migratePresetFileVersion`).
- Write (egress), always v2.1: `snapshot.ts` and `encode.ts` both stamp `PRESET_DOCUMENT_VERSION`, and `presetDocumentSchema` pins `version` to `z.literal(2.1)`; the compact encoder stamps `COMPACT_CODEC_VERSION`.
- There is no production downgrade path: `toV1` exists only in `migrate-v1.test.ts` as a round-trip helper.

## 2. Introducing a new version: the ordered checklist

When the document shape changes such that a bump is warranted (see section 3), touch these surfaces in this order.
The order is deliberate: the schema is the source of truth, so it moves first; reads and the share codec follow; tests and docs pin the result.

1. `document/document.ts`: define the new shape, bump `PRESET_DOCUMENT_VERSION`, and update the `version` literal in `presetDocumentSchema` plus any changed field schemas.
   This is the single writable contract; nothing else defines "current".
2. `document/migrate-vN.ts`: add a migration from the previously shipped version to the new one.
   If the change reinterprets any value that a frozen curve owns, freeze the old interpretation in a new `frozen-*` module and NEVER repoint a live one (the frozen-curve contract in `migrate-v1.ts` and `frozen-split-filter.ts`).
3. `document/decode.ts`: add the new version to the dispatch ladder.
   Route the previous current version through its new migration BEFORE the strict parse (mirror how `2` is routed ahead of the `2.1` strict parse), keep the strict-parse rung on `PRESET_DOCUMENT_VERSION`, and update the `UnsupportedVersionError` docstrings.
4. `document/snapshot.ts` and `document/encode.ts`: verify egress.
   Both already follow `PRESET_DOCUMENT_VERSION`, so no version edit is needed, but confirm `snapshot` maps every added or renamed field.
5. `lib/serialization/compact-v2.ts` and `serialization/index.ts`: reconcile the share codec.
   If the shape change touches any field the codec carries, bump `COMPACT_CODEC_VERSION`, add a decode branch (or an explicit documented refusal) for the old codec version, and update `urlToDocument`'s dispatch and docstrings.
   This is the step that was skipped for the 2 -> 2.1 filter change (Findings, #368); do not skip it.
6. Fixtures and tests: add a real fixture captured at the new format transition, extend `corpus.test.ts`, the golden tests, and the `decode(encode(doc))` / `snapshot(apply(doc))` round-trip property tests, and update the `unsupported-version.json` rationale if the accepted range moved.
7. Docs: update the version tables in this file and any stale narrative in docs/preset-persistence.md.

## 3. When a bump is warranted

Bump the version when a build that predates the change could mis-read a file the change produces, or when the same bytes would mean something different than they did before.
Concretely, bump when the persisted SHAPE changes: a field's representation changes (a 0-100 position becoming `{ side, cutoffHz }`), a field is added, removed, or renamed, an arity changes, or the stored meaning of a value changes.

Use a fractional minor (`x.y`) when the change is a strict refinement of the same generation and you want to signal "refinement, not a new generation".
That is what `1 -> 1.5` (swing reinterpretation) and `2 -> 2.1` (canonical filter) both are.
A minor still needs a migration whenever the meaning of a stored value changed.

Do NOT bump when the change cannot alter how any persisted value reads: tightening a schema bound that no in-the-wild file violated, adding an OPTIONAL field with a safe default, retuning a live UI curve (the frozen curves make a control retune a pure UI concern), or any comment, perf, or refactor change.
A schema tighten with no bump still requires a fixture proving no in-the-wild file relied on the old leniency, per the tolerant-schema contract in `file-v1.ts`.

## 4. The frozen legacy-read island and its sunset seam

The frozen legacy-read island is every surface that reads a pre-canonical (knob or position) value and converts it with a PERMANENTLY pinned curve, plus the tolerant legacy schemas and the one-time storage adopters.
Its members:

- `document/migrate-v1.ts` (`frozenV1Curves`: v1 knob -> canonical) and `document/frozen-split-filter.ts` (position -> canonical), the frozen curves.
- `document/file-v1.ts`, `document/parse.ts`, `document/migrate.ts`, the tolerant v1-family read and normalization.
- `types/legacy-v1.ts`, the knob-space types kept isolated so the shape cannot leak into live code.
- `lib/serialization/compact.ts` and `lib/serialization/decode.ts`, the v1.5 compact decoder.
- `session/legacy-adopter.ts`, `session/legacy-preset-meta-capture.ts`, and `library/adoption.ts`, the one-time localStorage adopters.
- `document/__fixtures__/` and `lib/serialization/__fixtures__/` with `corpus.test.ts`, `migrate-v1.golden.ts`, and the parity tests, which pin the frozen curves against the retired live curves.

Where the island ENDS: at the migration boundary.
Once `migrate-v1.ts`, `migrate-v2.ts`, or the v1.5 compact decoder produce a canonical v2.1 `PresetDocument`, no knob or position value exists downstream.
Stores, the engine, egress, and every newly written file or link are canonical only.
The frozen curves never read a live UI curve; the parity tests assert frozen equals live today, and on a deliberate retune the TEST is updated to pin the frozen values, never the frozen module.

The sunset seam: the island is deletable as one unit at the moment the product accepts breaking a legacy generation.
The v1.x sub-island (`migrate-v1.ts`, `file-v1.ts`, `parse.ts`, `migrate.ts`, `frozenV1Curves`, `types/legacy-v1.ts`, `compact.ts`, and the v1 fixtures) can be deleted together once no v1 / v1.5 `.dh` files or `v: 1.5` links need to load AND the one-time localStorage adopters have run everywhere and their legacy keys are gone.
Deleting it means removing the `1` / `1.5` rungs from `decode.ts` and `urlToDocument`, deleting those modules and fixtures, and letting `decode` reject those versions with `UnsupportedVersionError`.
`frozen-split-filter.ts` OUTLIVES the v1 sub-island because `migrate-v2.ts` also depends on it; it retires only when both v1 AND v2 documents are no longer read.
Because the island is import-isolated and fully covered by the fixture corpus, each deletion is mechanical and the corpus proves nothing live depended on it.
There is no scheduled sunset today; until one is chosen, the island is load-bearing forever.

## Findings

The audit found one substantive gap and two non-blocking observations.
No live correctness bug was found that warranted halting the audit.

- Compact codec `v: 2` changed filter shape without a version bump: issue [#368](https://github.com/mxfng/drumhaus/issues/368).
  The v2 compact codec shipped in #350 encoding the filter as a scalar 0-100 position (`f?: number`); PR B (#361) changed `f` to a canonical `[sideCode, cutoffHz]` pair to match the document's 2 -> 2.1 refinement but left `COMPACT_CODEC_VERSION` at `2`.
  So `v: 2` now labels two incompatible payload shapes, and a pre-#361 `v: 2` link decodes to a `CorruptFieldError` (invalid-link toast + init fallback).
  Severity is low: the change happened inside the unreleased #357 epic across a ~1-day window, share links are ephemeral, and the failure is fail-safe, so this is a documentation gap to sweep, not a live bug.
- Readable-version literals are decentralized (no issue filed).
  The readable-but-not-writable versions (`1`, `1.5`, `2`) appear as bare literals across `decode.ts` (`PRESET_DOCUMENT_VERSION_V2 = 2`), `migrate.ts`, and `file-v1.ts` rather than a single shared registry.
  This is not a correctness gap; a shared "readable versions" list would make the decode ladder self-documenting, worth folding into the later sweep.
- The Versioning and Migration-path sections of docs/preset-persistence.md are a past-tense design narrative that predates the shipped outcome (no issue filed).
  They describe an integer `CURRENT_VERSION = 2` and a `MIGRATIONS[]` ladder, whereas the code shipped a fractional `2.1` and an explicit if-ladder in `decode.ts`.
  This doc supersedes them as the living policy; the narrative is left as history.
