# Preset persistence: maturing .dh save/load

Status: proposed (audit complete, implementation pending review).
Author: Max, July 2026.
Tracking issue: #329.

## Summary

The audio engine is now a framework-free facade that deals in musical data pushed through the bridge, but `.dh` files remain snapshots of React-side store state, loaded through a non-atomic sequence of store writes with shallow validation and heuristic migrations.
This document inventories every producer and consumer of the `.dh`/`.dhkit` formats, assesses the versioning and migration story, analyzes the gaps against a pro-level persistence layer, and proposes a target design sequenced into incremental PRs.
The core findings: the `version` field is decorative (never bumped, migrations keyed on field presence instead), the share-URL encoding is unversioned with a positional kit index that will silently corrupt existing links when a kit is inserted, load is a half-applied-on-failure sequence of ~11 store writes, and a single failed sample leaves the UI and the engine showing different kits with no user feedback.

## Inventory

### Formats

There are three serialized shapes, plus one dead one.

**`.dh` = `PresetFileV1`** (`src/features/preset/types/preset.ts`).
A keyed JSON envelope: `{ kind: "drumhaus.preset", version: 1, meta, kit, transport, sequencer, masterChain }`.
`meta` is `{ id, name, createdAt, updatedAt, author? }` (`src/features/preset/types/meta.ts`).
`transport` is `{ bpm, swing }`.
`sequencer` is `{ pattern, chain, chainEnabled, variationCycle? }`, where `variationCycle` is a legacy field that the write path never emits and the read path only consumes for migration.
`pattern` is the engine-side type (`src/core/audio/engine/pattern-types.ts`): 8 voices, 4 variations each of `{ triggers[16], velocities[16], timingNudge, ratchets[16], flams[16] }`, plus per-variation `{ accent[16] }` metadata.
`masterChain` is 9 knob-space (0-100) values: filter, saturation, phaser, reverb, compThreshold, compRatio, compAttack, compMix, masterVolume, with legacy optional `lowPass`/`highPass` accepted on read.

**`.dhkit` = `KitFileV1`** (`src/features/kit/types/kit.ts`).
`{ kind: "drumhaus.kit", version: 1, meta, instruments[8] }`, where each instrument is `{ meta, role, sample: { meta, path, attribution? }, params: { decay, filter, volume, pan, tune, solo, mute } }`.
`sample.path` is a reference relative to `public/samples/`; audio is never embedded.
A full kit is embedded inside every `.dh`, so every preset file is self-describing except for the sample audio itself.

**Compact share format = `CompactPreset`** (`src/features/preset/lib/serialization/compact.ts`).
A separate single-letter-keyed shape for URL sharing: `{ id, k, n, ip, pt, ac?, vc?, ch?, ce?, bpm?, sw?, mc? }`.
Triggers, ratchets, flams, and accents are bit-packed into 4-hex-char strings; velocities are sparse maps of non-default steps; instrument params store only keys that differ from the init defaults; the chain is a string like `"A2B1"`.
`k` is the kit reference: the positional index of the kit in `KIT_ORDER`, not the stable `kit-N` id (`src/core/dhkit/index.ts`, `kitIdToCode`).
The whole object is minified, gzipped (pako level 9), base64url-encoded, and carried in the `?p=` query param.
It has no version field.

**Dead format: `ShareablePreset`/`OptimizedPattern`** (`src/features/preset/lib/serialization/types.ts`, `patterns.ts`).
A parallel "optimized" sparse format with a `version: 1` field that no live code path imports.
The doc comments in `serialization/index.ts` still describe this format, but the executing path uses `CompactPreset`.

### Producers

- File export: `getCurrentPreset` snapshot, `JSON.stringify(preset, null, 2)`, Blob with `application/octet-stream` (so iOS Safari keeps the `.dh` extension), object-URL anchor download (`src/features/preset/lib/operations.ts`).
  No File System Access API anywhere; export always mints a fresh id and timestamps.
- Share URL: same snapshot through `encodeCompactPreset` and compression (`serialization/index.ts`), triggered from the share dialog; the serialization module is dynamically imported to keep pako out of the main bundle.
  Non-default kits (ids not starting `"kit-"`) throw `CustomKitError`, though nothing in the app can currently produce one.
- Library save: full `PresetFileV1` objects (embedded kit included) appended to `customPresets` in the persisted preset-meta store (`drumhaus-preset-meta-storage`), capped at `MAX_CUSTOM_PRESETS = 100`.
- Tooling: `scripts/new-kit.ts` writes `.dhkit` files, but it targets the deleted `src/lib/kit/` layout and no longer integrates with the registry at `src/core/dhkit/`.

### Consumers

- File import: hidden `<input type="file" accept=".dh,.dh.json,...">`, `FileReader.readAsText`, `JSON.parse`, `validatePresetFile`, then `loadPreset` (`src/features/preset/hooks/use-preset-manager.ts`).
  There is no drag-and-drop import and no runtime `.dhkit` import or export at all; kits reach the app only as bundled defaults or embedded in a `.dh`.
- Boot: `loadFromUrlOrDefault` (`src/features/preset/hooks/use-preset-loading.ts`) decodes `?p=` if present; otherwise, if `drumhaus-preset-meta-storage` exists in localStorage, it relies entirely on Zustand rehydration (with an acknowledged TODO that nothing validates that data); otherwise it loads `init()`.
- Bundled defaults: 11 `.dh` files in `src/core/dh/defaults/` and 10 `.dhkit` files in `src/core/dhkit/defaults/`, compiled to ES modules at build time by the shared `dh-files` Vite plugin (`dh-files-plugin.ts`) and validated at import time.
  `getDefaultPresets()` lists 10 of the 11 presets; `superDreamHaus` is loaded but not listed.

### What a save captures, and what it does not

`getCurrentPreset` (`src/features/preset/lib/helpers.ts`) is the single producer of preset payloads for export, share, and library save.
It reads four stores back-to-back in one synchronous function, so a save is a consistent instant; torn snapshots are not possible.

Captured: instruments (full `InstrumentData` including solo/mute), pattern, chain, chainEnabled, bpm, swing, the 9 master-chain params, and preset/kit meta.

Not captured: the currently selected variation (A/B/C/D; re-derived from `chain.steps[0].variation` on load, so the user's selection is lost across save/load), chain playback position, `chainDraft` and other edit-session state, the groove store (`showVelocity`), and playback state.
The instruments store also carries a dead `durations` surface that nothing sets and nothing serializes.

### How loading reconciles with the pushed-state engine

`loadPreset` (`use-preset-loading.ts:77-141`) performs, in order: a synchronous `engine.stop()` via `togglePlay` if playing, `addCustomPreset`, `loadPresetMeta`, then ~9 more `set()` calls across the pattern, transport, master-chain, and instruments stores.
Zustand subscriptions fire synchronously per `set()`, so the bridge (`src/core/audio/bridge/use-engine-bridge.ts`) translates the sequence into roughly: `setPlayback` twice (variation lands with the old chain, then the chain lands), `setPattern`, `setTempo` and `setSwing` (issued directly by the transport store), `setMasterSettings`, per-channel continuous and play params for all 8 channels, and finally one async `engine.loadKit`.
The engine therefore holds the new pattern, tempo, and params against the old kit's channels until all 8 samplers finish loading, at which point `loadKit` atomically swaps channels, re-applies retained params, and bumps the kit version for the UI.
Concurrent loads are handled correctly by the engine's `loadSeq` token (last load wins, superseded channels disposed).
Failure is not handled correctly: if any single sample fails, `createKitChannels` disposes everything and throws, `loadKit` logs to the console and returns, the engine keeps the old kit, but the instruments store already committed the new kit, leaving UI and audio permanently desynced with no user feedback (`src/core/audio/engine/audio-engine.ts:343-349`).

## Schema assessment

### The version field is decorative

Both file formats carry `version: 1` checked by exact equality (`validatePresetFile`, `src/features/preset/lib/helpers.ts:75-77`; `validateKitFile`, `src/features/kit/lib/helpers.ts`).
Any other value, including a missing field or a future `2`, throws with no migration ladder.
Meanwhile the format has actually changed several times: `release`/`pitch`/`attack` became `decay`/`tune` (retrofitted after bug #238), `lowPass`/`highPass` collapsed into `filter`, `variationCycle` became `chain`, and the pattern grew `timingNudge`, `ratchets`, `flams`, and `accent`.
Every one of those changes shipped without a version bump; compatibility is maintained by heuristic field-presence migrations in `src/features/sequencer/lib/migrations.ts` (e.g. `isLegacyFormat = "release" in rawParams || "pitch" in rawParams`), invoked unconditionally at load and completely disconnected from the version literal.
The Zustand stores, by contrast, use versioning correctly: the instruments store is at persist version 2 and the pattern store at version 3, each with real `migrate` callbacks.
Two unsynchronized versioning philosophies coexist in the same codebase.

### The share format is unversioned and positionally fragile

`CompactPreset` has no version field at all; forward/backward compatibility is purely structural.
Its keyed fields degrade gracefully (unknown keys ignored, missing keys defaulted), but its positional parts do not:

- The kit code is `KIT_ORDER.indexOf(kitId)`.
  `KIT_ORDER` currently has `kit-1` (909) and `kit-2` (LinnDrum) commented out as reserved slots; the moment either is inserted, every previously shared URL decodes to the wrong kit with no error.
- `ip` and `pt` are assumed to be 8-element arrays; the validator checks array-ness but not length, so a truncated payload throws a `TypeError` deep in decode (caught by the URL path's try/catch, which falls back to `init()` with an error toast).

### Validation is shallow everywhere

`validatePresetFile` checks `kind` and `version`, then casts with `as`; nothing validates `sequencer`, `kit`, `transport`, or `masterChain` shapes.
`validateCompactPreset` checks only that `k` is a string and `ip`/`pt` are arrays.
There is no zod (or any schema library) on any persistence path; zod is used only for UI form fields.
A malformed-but-version-1 file passes the gate and throws mid-`loadPreset`, or worse, loads with silently wrong values.

### Silent-default inventory

Loaded values fall back to defaults with no report in three layers:

- `compact.ts` decode: every instrument param, every master-chain param, bpm, swing, chain, chainEnabled, and the preset name all `??`-default; `solo`/`mute` decode as `x === 1`, so any corrupt value silently becomes `false`.
- `migrations.ts`: `migrateInstrumentParams` replaces any wrong-typed field with a hardcoded literal (decay 50, volume 92, and so on), which masks corruption as a plausible value; `migrateMasterChainParams` and the step-sequence migrations do the same.
- `use-preset-loading.ts`: chain, initial variation, and chainEnabled each have two levels of fallback.

Defaulting a genuinely absent legacy field is correct migration behavior; defaulting a present-but-corrupt field is data loss dressed as success.
The current code cannot distinguish the two.

### Compatibility break matrix

For the keyed `.dh` format:

- Add a field, new app reads old file: safe, migration defaults apply.
- Add a field, old app reads new file: the version is still 1 so the gate passes, the unknown field is ignored, and a re-save through `getCurrentPreset` silently drops it.
  Round-tripping a file through an older build loses data with no error.
- Rename a field without a new heuristic: both directions silently default.
- Bump the version to 2: every existing build hard-throws with no ladder to extend.

For the compact format: new keyed fields are tolerant in both directions, but any change to array arity, the chain string grammar, bit-packing, or `KIT_ORDER` ordering breaks silently or throws, and there is no version field to key a decoder on.

### localStorage persistence

Nine stores persist; the ones relevant here are preset-meta (`customPresets` as full `PresetFileV1[]`, persist version 1, no `migrate`), instruments (v2, migrated), pattern (v3, migrated with a try/catch falling back to an empty pattern), transport (unversioned, and its `onRehydrateStorage` pushes bpm/swing into the engine), and master-chain.
`customPresets` are stored verbatim and only fixed up when actually loaded; that lazy policy is the root of past bug #238 and remains in place.
Boot skips loading `init()` whenever the preset-meta key exists, trusting rehydrated state without validation (the TODO at `use-preset-loading.ts:158-160`).
`cleanPreset`, the dirty-tracking baseline, is deliberately excluded from persistence, so after a reload `hasUnsavedChanges()` compares against the init default rather than the actually-loaded preset.

## Gap analysis against pro-level

**Atomicity of save.**
The snapshot itself is atomic (synchronous cross-store reads).
The gaps are downstream: library saves write up to 100 full presets with embedded kits into one localStorage key with no quota-exceeded handling, and file export cannot fail informatively (Blob download has no error channel, which is acceptable; the quota case is not).

**Atomicity of load.**
None.
Parsing, migration, and store mutation are interleaved; a throw after `loadPresetMeta` leaves meta pointing at the new preset while pattern, transport, master, and instruments still hold the old one.
The file-import and URL paths catch and toast (URL additionally repairs by loading `init()`), but the library-switch path has no try/catch at all; only the global window error handler fires, with no state repair.
The async kit swap adds a second torn window: new pattern and params against old samples until `loadKit` resolves, and permanently if it fails.

**Corruption handling.**
A corrupt file either crashes mid-load (half-applied state) or loads "successfully" with silently defaulted values, depending on which field is corrupt.
Neither outcome tells the user their data is damaged.
Rehydrated localStorage is trusted blindly.

**Schema validation on load.**
Two fields deep on files, three fields deep on URLs, zero on localStorage.

**What user data loss looks like today.**

- Unsaved edits are silently discarded by file import, opening a share link, and deleting the current preset; the unsaved-changes dialog guards only library switching, and there is no `beforeunload` guard.
- Round-tripping a `.dh` through an older build drops any newer fields without warning.
- Corrupt fields load as defaults, so a damaged file overwrites good in-memory state with plausible-looking wrong values, and a subsequent library save persists the damage.
- Inserting a kit into `KIT_ORDER` retroactively corrupts every shared URL in the wild.
- A single 404ing sample leaves the store and the engine on different kits; saving in that state persists instruments the user cannot hear.
- Post-reload dirty detection is unreliable (`cleanPreset` not persisted), so the guard that does exist can both false-positive and false-negative.

## Target design

Principles: parse, don't validate (one schema source of truth producing typed values or typed errors); migrations keyed on an honest version number; all parsing and migration completed before any store mutation; failures loud and specific; every accepted legacy shape pinned by a fixture test.

### Schema module

A new `src/features/preset/schema/` module owns zod schemas for the `.dh` envelope, the kit, the pattern, and the compact format, plus a typed error taxonomy (`InvalidFile`, `UnsupportedVersion`, `CorruptField`, `UnknownKit`, ...).
Every load surface (file import, share URL, `customPresets`, and bundled defaults via a build-time test) parses through it.
Deep validation replaces the `as` casts; array arities (8 voices, 4 variations, 16 steps) and value ranges become explicit.
Defaults for genuinely optional fields live in the schema or the migration for exactly one version transition, never as scattered `??` at use sites.

### Version-keyed migration ladder

Migration becomes a ladder: parse the envelope (`kind` + `version`), apply `MIGRATIONS[version]` steps up to `CURRENT_VERSION`, then strict-parse the result against the current schema.
The existing heuristics (param renames, `lowPass`/`highPass`, `variationCycle`, array-shaped patterns, missing nudge/ratchet/flam/accent fields) are folded into a single normalization step for version 1 inputs, pinned by fixtures generated from real historical files.
The `.dh` version bumps to 2 as the formalization point: version 2 is defined as today's canonical shape with none of the legacy spellings, so the 1-to-2 migration is exactly the current heuristic set, run once and then retired from the hot path.
Old builds reading a v2 file fail with a clean "unsupported version" error rather than silent field loss, which is the correct failure mode the current exact-equality gate accidentally provides; whether to soften it further is an open question below.

### Versioned compact format

The compact encoding gains a `v` field; a payload without `v` is decoded by the frozen legacy decoder, so every existing shared link keeps working indefinitely (or until a sunset date, see open questions).
The kit reference switches from a positional index to the stable kit id, removing the `KIT_ORDER` insertion hazard at the cost of a few URL characters.
The decoder validates array lengths and rejects structurally short payloads with a typed error instead of a `TypeError`.

### Atomic load pipeline

Loading becomes `parse -> migrate -> validate -> commit`: everything that can fail happens before the first store write, producing a fully-formed, canonical preset value.
The commit phase then applies all store writes; since parsing can no longer throw mid-commit, the half-applied failure mode disappears, and every entry point (import, URL, library switch, delete-fallback) shares one error boundary with typed, user-facing messages.
Kit-load failure gets surfaced: `engine.loadKit` (or a bridge-level wrapper) reports its outcome, and on failure the app either rolls the instruments store back to the last kit the engine actually holds or keeps the store state and offers a retry, with a toast either way (open question on which).
This closes the silent UI/engine desync.

### Dirty-state and data-loss guards

`cleanPreset` (or a content hash of it) joins the persisted preset-meta state so dirty detection survives reloads.
The unsaved-changes check extends from library switch to file import, share-link boot, and delete-current.
A `beforeunload` prompt fires only when dirty (open question; localStorage autosave already limits the blast radius).
Library saves handle `QuotaExceededError` explicitly instead of throwing into the void.

### Stored-library hygiene

The preset-meta persist version bumps, and its `migrate` runs every stored custom preset through the same parse-and-migrate pipeline at rehydrate time.
Presets that fail to parse are quarantined (kept raw under a separate key, surfaced as a count with an export escape hatch) rather than dropped or left as load-time landmines.

### Cleanups

Delete the dead `ShareablePreset`/`patterns.ts` format and fix the stale comments in `serialization/index.ts`; delete or rewrite `scripts/new-kit.ts` against `src/core/dhkit/`; remove the dead `durations` surface; add `superDreamHaus` to `getDefaultPresets()` or delete the file.

### Test spine

A fixture corpus drives everything: historical `.dh` files (mined from git history at each format transition), legacy share URLs, current-version files, and deliberately corrupt variants.
Golden tests assert that each fixture migrates to a pinned canonical snapshot or fails with the expected typed error, and a round-trip property test asserts `save(load(x))` is idempotent for current-version files.

## Migration path

Each PR is independently shippable; PR 1 gates the rest.

### PR 1: schema module and fixture corpus (no behavior change)

Add the zod schemas and error taxonomy, mirroring exactly what today's code accepts; wire file and URL import through them behind the existing toasts; land the fixture corpus and golden tests.
Risk: an over-strict schema rejecting in-the-wild files that previously loaded via silent defaults; mitigated by modeling every observed legacy shape in the corpus before enforcement, and by shipping the schema in warn-only mode first if any doubt remains.

### PR 2: version ladder and the v2 bump

Introduce `CURRENT_VERSION = 2`, fold the heuristics into the 1-to-2 migration, dual-read versions 1 and 2, write version 2.
Risk: old builds (stale tabs, old deployments) hard-reject v2 files with a clean error; this is the intended compatibility break and needs sign-off (open question 1).

### PR 3: atomic load pipeline and kit-failure surfacing

Restructure `loadPreset` into parse/migrate/validate/commit, unify error handling across entry points, propagate `loadKit` outcomes to the UI with rollback or retry.
Risk: this touches the store/bridge/engine boundary; the existing golden render tests plus new load-pipeline tests gate it, and the engine's `loadSeq` semantics are left untouched.

### PR 4: compact format v2

Add the `v` field, stable kit ids, and length validation; keep the frozen legacy decoder for versionless payloads.
Risk: regressions in shared-link decoding; mitigated by legacy URL fixtures captured before the change.

### PR 5: dirty-state and quota guards

Persist `cleanPreset`, extend unsaved-changes checks to all destructive loads, add the optional `beforeunload` prompt, handle localStorage quota on save.
Risk: low technically; the UX choices are open questions 6 and 7.

### PR 6: stored-library migration and quarantine

Bump the preset-meta persist version, migrate `customPresets` at rehydrate, quarantine unparseable entries, close the boot-time validation TODO.
Risk: highest user-data sensitivity of the series; the quarantine-never-delete policy plus a pre-migration raw export path mitigates it.

### PR 7: cleanups

Dead format, stale script, dead `durations`, unlisted default preset.
Risk: none.

## Open questions

These are the decisions that need Max's judgment before or during implementation; nothing below is assumed by the PRs that precede it.

1. **Version bump policy.**
   Formalize as `.dh` version 2 (clean ladder anchor, old builds cleanly reject new files), or stay on version 1 with additive-only evolution and strict validation (no break, but the version field stays meaningless and renames stay heuristic)?
   PR 2 assumes the bump.
2. **Forward-compatibility posture.**
   When a future app writes version 3, should a version-2-era build hard-refuse (current behavior, simplest), or attempt best-effort load with a warning (requires an envelope design decision now, e.g. a `minReader` field or major/minor split)?
3. **Unknown-field policy.**
   Should load preserve unknown fields and re-emit them on save (protects round-trips through older builds), or keep dropping them (simpler, current behavior)?
4. **Share-link compatibility horizon.**
   Keep the frozen legacy URL decoder forever, or time-box it?
   And confirm the kit-reference change from positional index to stable id, which lengthens URLs slightly.
5. **Kit-load failure handling.**
   On sample failure, roll the instruments store back to the kit the engine still holds (UI snaps back, honest but surprising), or keep the new store state with a persistent error and retry affordance (UI stays put, audio stays old)?
6. **beforeunload prompt.**
   Wanted when dirty, or is Zustand-persist autosave considered sufficient protection against tab closes?
7. **Serialize the current variation?**
   Should the selected A/B/C/D variation be captured in the preset (user intent preserved across save/load), or stay derived from the chain's first step (current)?
8. **Custom samples roadmap.**
   Is `.dh` staying JSON-with-sample-references over the bundled registry, or are user-imported samples planned?
   If they are, the v2 boundary is the moment to choose a container (e.g. zip with embedded audio) rather than retrofitting one at v3.
9. **Stored-library migration policy.**
   Eager migration at rehydrate with quarantine (proposed, PR 6), or keep the current lazy fix-on-load and accept that stored presets age?
10. **Dead format deletion.**
    Confirm deleting `ShareablePreset`/`OptimizedPattern` (`serialization/types.ts`, `patterns.ts`) and the stale `scripts/new-kit.ts`, or should the kit script be rewritten against `src/core/dhkit/` instead (it is the only kit-authoring tool)?
