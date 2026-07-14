# Preset persistence: maturing .dh save/load

Status: accepted (audit complete, open questions resolved in review, implementation pending).
Author: Max, July 2026.
Tracking issue: #329.

## Summary

The audio engine is now a framework-free facade that deals in musical data pushed through the bridge, but `.dh` files remain snapshots of React-side store state, loaded through a non-atomic sequence of store writes with shallow validation and heuristic migrations.
This document inventories every producer and consumer of the `.dh`/`.dhkit` formats, assesses the versioning and migration story, analyzes the gaps against a pro-level persistence layer, and proposes a target design sequenced into incremental PRs.
The core findings: the `version` field is decorative (never bumped, migrations keyed on field presence instead), the share-URL encoding is unversioned with a positional kit index that will silently corrupt existing links when a kit is inserted, load is a half-applied-on-failure sequence of ~11 store writes, and a single failed sample leaves the UI and the engine showing different kits with no user feedback.
A first-principles format review (see Format assessment) concludes that the JSON-file approach itself is the norm for this class of instrument and needs no rewrite; the flaws are in validation, versioning, and load orchestration, not in the choice of container.
The ten open questions from the initial draft were resolved in review; they are recorded with rationale in the Decisions section.

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

## Format assessment

The review asked a fair question: is JSON even the right container, and are the schemas themselves sound, or does pro-level warrant a rewrite?
Verdict: the approach is squarely the norm for this class of application, and no rewrite is warranted; what is missing is rigor around the format, not a different format.

### JSON is the right container

Browser-based and open music tools overwhelmingly persist patches as plain JSON or text: VCV Rack's `.vcv` is JSON, the live-coding family (Sonic Pi, Strudel) is text, and the web-audio ecosystem is JSON throughout.
Native DAWs that use compressed or binary containers (Ableton's `.als` is gzipped XML, Renoise's `.xrns` is a zip) do so to manage multi-megabyte projects and embedded assets, neither of which applies to a `.dh` at a few kilobytes with registry-referenced samples.
At this size, human-readable pretty-printed JSON is a feature, not a compromise: factory presets are versioned in git and diff cleanly, users can inspect and hand-repair files, and the golden-fixture strategy in this design depends on that inspectability.
Compression and binary encoding already exist where they earn their keep, in the URL share path.
A zip-style container becomes the right call only if user-imported samples ship with embedded audio; per decision 8 that is endgame-or-never, so choosing a container now would be speculative complexity.

### The schema shapes are mostly right; two deserved scrutiny

**The embedded kit stays.**
Embedding the full kit in every `.dh` makes files self-describing and immune to kit-registry reordering or retuning, at a cost of a few kilobytes, and it matches how instrument patches conventionally store their full parameter state.
Reference-style kit storage is what the compact URL format is for; keeping both gives each surface the right tradeoff.

**Knob-space values stay, with a new policy.**
The one genuinely debatable schema decision is that `.dh` stores UI knob positions (0-100) while the engine speaks domain units (Hz, dB, seconds).
Storing domain units would make files sound-faithful under knob-mapping retunes, but it would require an inverse mapping per parameter, add two mapping crossings to every save/load, and break the property that a file is an exact store snapshot.
Storing knob positions matches hardware convention (patches store device-unit parameter values) and keeps save and load pure snapshots.
The real hazard is not the choice but the absence of a rule: today, retuning a knob curve silently changes how every existing preset sounds.
The version ladder makes the rule enforceable, so it becomes policy: a knob-mapping retune is a format change, requiring a version bump and a converting migration.

**The rest holds up.**
The envelope (`kind`, `version`, `meta`) follows convention.
Dense 16-element arrays are verbose but readable and diffable, and the compact format already solves size where size matters.
The pattern shape (voices, then variations, plus variation-level metadata) is a faithful model of the instrument.

## Target design

Principles: parse, don't validate (one schema source of truth producing typed values or typed errors); migrations keyed on an honest version number; all parsing and migration completed before any store mutation; failures loud and specific; every accepted legacy shape pinned by a fixture test.

### Schema module

A new `src/features/preset/schema/` module owns zod schemas for the `.dh` envelope, the kit, the pattern, and the compact format, plus a typed error taxonomy (`InvalidFile`, `UnsupportedVersion`, `CorruptField`, `UnknownKit`, ...).
Every load surface (file import, share URL, `customPresets`, and bundled defaults via a build-time test) parses through it.
Deep validation replaces the `as` casts; array arities (8 voices, 4 variations, 16 steps) and value ranges become explicit.
Unknown fields are stripped at load with a console warning rather than preserved or hard-rejected (decision 3).
Defaults for genuinely optional fields live in the schema or the migration for exactly one version transition, never as scattered `??` at use sites.

### Version-keyed migration ladder

Migration becomes a ladder: parse the envelope (`kind` + `version`), apply `MIGRATIONS[version]` steps up to `CURRENT_VERSION`, then strict-parse the result against the current schema.
The existing heuristics (param renames, `lowPass`/`highPass`, `variationCycle`, array-shaped patterns, missing nudge/ratchet/flam/accent fields) are folded into a single normalization step for version 1 inputs, pinned by fixtures generated from real historical files.
The `.dh` version bumps to 2 as the formalization point: version 2 is defined as today's canonical shape with none of the legacy spellings, so the 1-to-2 migration is exactly the current heuristic set, run once and then retired from the hot path.
Old builds reading a v2 file fail with a clean "unsupported version" error rather than silent field loss, which is the correct failure mode the current exact-equality gate accidentally provides; per decision 2 this hard refusal is the permanent forward-compatibility policy, with no best-effort reading of newer files.
The ladder also enforces the knob-mapping policy from the format assessment: retuning a mapping curve means a version bump with a converting migration.

### Versioned compact format

The compact encoding gains a `v` field, and per decision 4 the legacy versionless decoder is deleted rather than frozen: a payload without `v` fails with the existing invalid-link toast and init fallback.
Existing shared links break cleanly; this is an accepted deliberate break that removes an entire frozen decoder from the maintenance surface.
The kit reference switches from a positional index to the stable kit id, removing the `KIT_ORDER` insertion hazard at the cost of a few URL characters.
The decoder validates array lengths and rejects structurally short payloads with a typed error instead of a `TypeError`.

### Atomic load pipeline

Loading becomes `parse -> migrate -> validate -> commit`: everything that can fail happens before the first store write, producing a fully-formed, canonical preset value.
The commit phase then applies all store writes; since parsing can no longer throw mid-commit, the half-applied failure mode disappears, and every entry point (import, URL, library switch, delete-fallback) shares one error boundary with typed, user-facing messages.
Kit-load failure gets surfaced: `engine.loadKit` (or a bridge-level wrapper) reports its outcome, and on failure the app rolls the instruments store back to the last kit the engine actually holds and notifies the user (decision 5).
The UI never shows a kit the audio does not have; this closes the silent UI/engine desync.

### Dirty-state and data-loss guards

`cleanPreset` (or a content hash of it) joins the persisted preset-meta state so dirty detection survives reloads.
The unsaved-changes check extends from library switch to file import, share-link boot, and delete-current.
No `beforeunload` prompt is added; Zustand-persist autosave is considered sufficient protection against tab closes (decision 6).
Library saves handle `QuotaExceededError` explicitly instead of throwing into the void.

### Stored-library hygiene

The preset-meta persist version bumps, and its `migrate` runs every stored custom preset through the same parse-and-migrate pipeline at rehydrate time.
Presets that fail to parse are quarantined (kept raw under a separate key, surfaced as a count with an export escape hatch) rather than dropped or left as load-time landmines.

### Cleanups

Delete the dead `ShareablePreset`/`patterns.ts` format and fix the stale comments in `serialization/index.ts`; delete the stale `scripts/new-kit.ts` (kit authoring is manual until a new kit actually lands, at which point a fresh script can be written against `src/core/dhkit/`); remove the dead `durations` surface; add `superDreamHaus` to `getDefaultPresets()` or delete the file.

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
Risk: old builds (stale tabs, old deployments) hard-reject v2 files with a clean error; this is the intended compatibility break, signed off in decision 1.

### PR 3: atomic load pipeline and kit-failure surfacing

Restructure `loadPreset` into parse/migrate/validate/commit, unify error handling across entry points, propagate `loadKit` outcomes to the UI with rollback or retry.
Risk: this touches the store/bridge/engine boundary; the existing golden render tests plus new load-pipeline tests gate it, and the engine's `loadSeq` semantics are left untouched.

### PR 4: compact format v2

Add the `v` field, stable kit ids, and length validation; delete the legacy versionless decoder (decision 4).
Risk: every previously shared link stops resolving and falls back to init with an error toast; this is a deliberate, accepted break.

### PR 5: dirty-state and quota guards

Persist `cleanPreset`, extend unsaved-changes checks to all destructive loads, and handle localStorage quota on save; no `beforeunload` prompt (decision 6).
Risk: low.

### PR 6: stored-library migration and quarantine

Bump the preset-meta persist version, migrate `customPresets` at rehydrate, quarantine unparseable entries, close the boot-time validation TODO.
Risk: highest user-data sensitivity of the series; the quarantine-never-delete policy plus a pre-migration raw export path mitigates it.

### PR 7: cleanups

Dead format, stale script, dead `durations`, unlisted default preset.
Risk: none.

## Decisions

The ten open questions from the initial draft were resolved in review on 2026-07-14.
They are recorded here with rationale so implementation PRs can cite them by number.

1. **Version bump: yes, v2.**
   Everything before this change is considered the immature form of `.dh` persistence.
   Version 2 is the formalization point; the 1-to-2 migration folds in all existing field-presence heuristics, which then retire from the hot path.
2. **Forward compatibility: hard refusal.**
   The schema is not expected to evolve much; an older build reading a newer file fails with a clean "unsupported version" error, and no `minReader` or best-effort machinery is built.
3. **Unknown fields: strip at load with a warning.**
   Restated in product terms: with hard version gating, unknown fields cannot arise from version skew (newer files are refused outright), so they can only come from hand-edited files or third-party tooling adding keys.
   Preserving them through load and save would mean carrying opaque data drumhaus cannot validate, while hard-rejecting would refuse an otherwise-working file over a stray key.
   Stripping with a console warning takes the middle path, and the strict schema still catches typos and corruption loudly.
4. **Legacy share links: killed.**
   The versionless compact decoder is deleted rather than frozen; old links fail with the existing invalid-link toast and fall back to init.
   A deliberate, accepted break on a personal project, in exchange for not maintaining a frozen decoder.
5. **Kit-load failure: roll back and notify.**
   On sample failure the instruments store rolls back to the kit the engine actually holds, with a user-facing error; the UI never shows a kit the audio does not have.
6. **No beforeunload prompt.**
   Zustand-persist autosave is sufficient protection against tab closes.
7. **Current variation stays derived, not serialized.**
   A `.dh` is a preset in the instrument sense, a musical artifact, not a saved workspace, so it should not reopen into a specific editing surface.
   Its playback entry point is already defined by the chain, and the selected A/B/C/D pad is performance state; deriving the initial selection from the chain's first step keeps session state out of the format, consistent with how hardware presets behave.
8. **No container format now.**
   User-imported samples are endgame or possibly never; `.dh` stays plain JSON with registry sample references.
   A zip-style container with embedded audio is deferred to the version boundary where user samples actually ship, if they ever do.
9. **Stored library: eager migration with quarantine.**
   As proposed in PR 6: migrate `customPresets` at rehydrate, quarantine what fails to parse, never delete.
10. **Dead formats: deleted.**
    `ShareablePreset`/`OptimizedPattern` (`serialization/types.ts`, `patterns.ts`) go, along with the stale `scripts/new-kit.ts`; kit authoring is manual until a new kit lands.
