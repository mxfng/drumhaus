# Preset persistence: maturing .dh save/load

Status: accepted (audit complete, greenfield redesign adopted in review, implementation pending).
Author: Max, July 2026.
Tracking issue: #329.

Update (2026-07-14, #269): the swing retune landed before this design's document model shipped, as `.dh` version 1.5.
Version 1.5 is a knob-space revision of the v1 shape (identical fields; `transport.swing` knob values written under the old curve are rescaled by 4/3 on load, see `src/features/preset/document/migrate.ts`), the share codec gained a `v` field mirroring the file version (absent = legacy URL, swing migrated on decode), and the transport persist is now versioned (v1, with a swing migrate).
Version 2 remains the domain-unit document described below, unchanged; its 1-to-2 migration must now also accept 1.5 as input (the swing rescale is already applied there).
The audit sections still describe the pre-#269 state where they mention an unversioned codec and transport persist.

## Summary

The audio engine is now a framework-free facade that deals in musical data pushed through the bridge, but `.dh` files remain snapshots of React-side store state, loaded through a non-atomic sequence of store writes with shallow validation and heuristic migrations.
This document inventories every producer and consumer of the `.dh`/`.dhkit` formats, assesses the versioning and migration story, analyzes the gaps against a pro-level persistence layer, and derives a greenfield target design plus the migration path to it, sequenced into incremental PRs.
The core findings: the `version` field is decorative (never bumped, migrations keyed on field presence instead), the share-URL encoding is unversioned with a positional kit index that will silently corrupt existing links when a kit is inserted, load is a half-applied-on-failure sequence of ~11 store writes, and a single failed sample leaves the UI and the engine showing different kits with no user feedback.
A first-principles format review (see Format assessment) concludes that the JSON-file approach itself is the norm for this class of instrument and needs no rewrite; the flaws are in validation, versioning, and load orchestration, not in the choice of container.
Two schema-level changes land with v2: parameter values move from UI knob positions to the engine's domain units, decoupling the format from the UI (decision 11), and the embedded kit is replaced by a stable registry reference, collapsing the file and share formats into one data model (decision 12).
At review's request the whole target was then rethought greenfield, unconstrained by the legacy persistence code: the result is document-centric, with one canonical preset document defined against the engine's command surface, one decode-migrate-validate-apply pipeline behind every ingress (boot restore, file import, share link, library), and document storage replacing both the five per-store persists of musical state and the monolithic library array.
The open questions from the initial draft were resolved in review; they are recorded with rationale in the Decisions section.

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

### Two schema shapes changed under scrutiny; the rest holds up

**The embedded kit goes: v2 references kits by id (decision 12).**
The initial draft kept the embed for self-description and registry-independence, but review pressed on whether that holds up greenfield, and it does not.
A `.dh` is not actually self-contained either way: the audio lives in the app bundle and is referenced by path, so embedding kit metadata without the samples buys the appearance of portability, not the substance.
The reordering hazard the embed guards against is solved by stable kit ids alone, and the embed's real effect is denormalization: every preset file and every localStorage library entry carries a stale copy of registry data (sample paths, roles, attribution), so registry fixes never propagate to existing presets.
The compact URL format already proved the reference model: a kit id plus the user-mutable instrument params, rehydrated from the registry.
v2 adopts it for files too, which collapses the file and share formats into one data model with two encodings, and it extends cleanly to the custom-sample endgame as a discriminated union (a registry reference, or an inline kit carried only when it actually differs from the registry).
It leans on one new contract, stated in the greenfield design: published kit ids are immutable.

**Knob-space values go: v2 stores domain units (decision 11).**
The initial draft's one genuinely debatable call was keeping UI knob positions (0-100) in the file, with a policy that knob-curve retunes require a version bump.
Review overruled it: the file format should be UI-agnostic and coupled to the engine, which is the stable semantic core after the engine refactor, while knob curves are a UI concern that should be free to change.
The v2 schema therefore stores the engine's domain vocabulary (Hz, dB, seconds, playback rate, normalized mix fractions), exactly as `setChannelParams` and `setMasterParams` consume it.
Pattern data (triggers, normalized velocities, nudge) and bpm already speak musical units; this change brings the instrument and master parameters in line, and any remaining knob-space stragglers (swing, if it proves to be one) get audited in PR 2.
The costs the draft weighed are real but contained: each mapping needs an inverse (the curves are monotonic, so invertible), save and load each gain one mapping crossing at the serialization boundary, and the stores and bridge stay knob-space so nothing else moves.
The payoff is structural: the 1-to-2 migration freezes the current curves as the permanent interpretation of v1 files, and from v2 on, retuning a knob curve changes where a knob sits, never how a saved preset sounds.

**The rest holds up.**
The envelope (`kind`, `version`, `meta`) follows convention.
Dense 16-element arrays are verbose but readable and diffable, and the compact format already solves size where size matters.
The pattern shape (voices, then variations, plus variation-level metadata) is a faithful model of the instrument.

## Greenfield design

This section answers the review's sharpest question: how would this be built today, from scratch, with the engine-centric architecture as a given and none of the legacy persistence code?
The answer is document-centric: one canonical preset document defined against the engine's command surface, one pipeline that every ingress and egress passes through, and storage that holds documents rather than store snapshots.
The audit sections above describe the migration source; nothing in this section is constrained by it.

### The organizing idea: one document, one pipeline

A preset document is the complete argument set to the engine's command surface, plus identity metadata.
It is not the UI stores' shape (v1's mistake), and it is not the engine's retained state either: the engine keeps only a lossy precomputed pattern after `setPattern`, so the document must carry the raw editable `Pattern`.
The document is the engine's input, not its memory: `apply(document)` is, conceptually, the full sequence of engine commands that makes the instrument sound like the preset.
The boundary is exact and was verified against the bridge: everything musical that flows store-to-engine is in the document (pattern, playback, channel params, kit reference, bpm, swing, master), and everything that does not flow is out (edit mode, voice selection, chain draft, clipboard, playhead, playback state).
One canonical model then has N encodings: pretty-printed JSON for the `.dh` file, the compact string for the share URL, and minified JSON for storage entries.
One schema, one migration ladder, one error taxonomy; every encoding is a codec over the same document, so a format change happens in exactly one place.
Every ingress runs the same pipeline, `decode -> migrate -> validate -> document`, then `apply(document)` commits atomically; boot restore, file import, share link, and library select become one code path with one error boundary.
Every egress is `snapshot() -> encode`.

### The document model (v2)

The document, with units chosen from the mapping audit:

```
kind: "drumhaus.preset"
version: 2
meta        { id, name, createdAt, updatedAt, author? }
kit         { id }                                     // registry reference (decision 12)
channels[8] { decaySeconds     0.005..5
              filter            0..100 split position  // see decision 15
              volumeDb          -46..4 | null          // null = silence
              pan               -1..1
              tuneSemitones     -7..+7
              mute, solo        boolean }
pattern     { voices[8] x variations[4] x
                { triggers[16], velocities[16] 0..1,
                  timingNudge -2..2, ratchets[16], flams[16] },
              variationMetadata[4] { accent[16] } }
playback    { chain (max 8 steps of { variation 0..3, repeats 1..8 }),
              chainEnabled }
transport   { bpm, swing 0..0.5 }
master      { filter            0..100 split position
              saturation        0..1                   // macro
              phaser            0..1
              reverb            0..1                   // macro
              compThresholdDb   -40..0
              compRatio         1..8 integer
              compAttackSeconds 0.001..0.1
              compMix           0..1
              masterVolumeDb    -46..4 | null }
```

Each unit choice is forced by something the mapping audit surfaced (decision 15):

- The split filters store the 0-100 position because that is the engine's own vocabulary: `MasterChainSettings.filter` and `ContinuousRuntimeParams.filter` take the position, the LP/HP split and its response curve live inside the engine (`fx/split-filter.ts`), and the Hz value is non-bijective across the split (an LP position and an HP position can produce the same frequency).
- Saturation and reverb are macros: one musical control fans out to two engine fields with a fixed recipe (`saturationWet` plus `saturationAmount`; `reverbWet` plus `reverbDecay`).
  The document stores one normalized amount and the recipe stays engine-side; storing both fields was rejected because a redundant pair invites hand-edited files with inconsistent halves that the schema cannot reconcile.
- Volume fields are nullable dB because the mapping hits `-Infinity` at the bottom of the range and JSON has no `-Infinity`; `null` means silence, explicitly.
- Tune is a semitone offset rather than Hz because Hz bakes each instrument's base pitch into the file; the semitone offset is the musical intent and stays valid if a kit sample's base pitch is ever corrected.
- Comp ratio is the integer 1..8 the mapping already quantizes to.
- Swing is the 0..0.5 fraction the engine consumes, not the store's 0-100 knob value; bpm is already raw in both store and engine.
- Velocities, accents, ratchets, flams, and nudge are already musical values and carry over unchanged; the accent boost factor, flam offset, and ratchet spacing are engine constants, not preset fields, and stay that way.

### The pipeline and its two halves

`snapshot()` reads the stores and crosses knob-to-domain once, using the same mapping module the bridge uses, so the document a save produces is by construction the state the engine is hearing; a dev-mode assertion can compare `snapshot()` against the bridge's last pushes.
`apply(document)` is all-or-nothing: decode, migration, and validation have already happened in the codec, so apply only stops playback, crosses domain-to-knob, and commits all stores in one pass; the bridge then propagates to the engine exactly as it does for any store change.
Kit resolution is part of apply's contract: on sample failure the instruments store rolls back to the kit the engine actually holds and the user is notified (decision 5), so the UI never shows a kit the audio does not have.
The wiring audit confirmed apply is safe at boot, before any user gesture: every engine command is retained lazily or writes the module-level transport, nothing needs a running AudioContext until `play()`, and the bridge already performs an explicit initial push after mount.
A typed error taxonomy (`InvalidFile`, `UnsupportedVersion`, `CorruptField`, `UnknownKit`, `StorageFull`, ...) surfaces through one boundary with user-facing messages; unknown fields are stripped with a console warning (decision 3).

### Versioning

The living versioning policy (the canonical version list, the ordered checklist for adding a version, the bump-vs-fix rule, and the frozen-island sunset seam) is docs/preset-versioning.md; this section is the original design narrative and predates the shipped fractional `2.1`.
The envelope is `kind` plus an integer `version`; migration is a ladder (`MIGRATIONS[version]` steps up to `CURRENT_VERSION = 2`), followed by a strict parse of the result, and every accepted legacy shape is pinned by a fixture generated from a real historical file.
The 1-to-2 migration is where the entire legacy is absorbed in one step: the field-presence heuristics (param renames, `lowPass`/`highPass`, `variationCycle`, array-shaped patterns), the knob-to-domain conversion under the frozen v1 curves (decision 11), the embedded-kit dereference (decision 12), the swing knob-to-fraction conversion, and the macro folding.
Newer versions hard-refuse on older builds with a clean "unsupported version" error (decision 2), and after v2 a knob-curve retune is a pure UI change that can never alter how a saved preset sounds.

### Kit registry contract

Kit-by-reference (decision 12) is only sound if references stay meaningful, so the registry takes on an explicit contract: a published kit id is immutable, its slot roles and sonic content do not change once shipped, and changing a kit's sound means publishing a new id.
Retiring a kit means keeping its id resolvable (the samples are cheap) rather than deleting it, so no preset is ever orphaned by cleanup.
A preset referencing an id the build does not know fails with a typed unknown-kit error rather than silently substituting sounds, consistent with the hard-refusal posture of decision 2.

### Share encoding

The compact codec is just another encoder over the document: a `v` field, stable kit ids, bit-packed pattern data, sparse non-default values, per-field quantization chosen to round-trip knob resolution, gzip, base64url.
The legacy versionless decoder is deleted (decision 4); old links fail with the existing invalid-link toast and init fallback, a deliberate accepted break.
Length and shape validation happen in the codec like everywhere else, with typed errors instead of `TypeError`s.

### Session storage: the document replaces five persists

This is the largest divergence from the incremental plan (decision 13).
Today the working session is smeared across five independently versioned Zustand persist keys (instruments v2, sequencer v3, transport unversioned, master-chain unversioned, preset-meta v1), each with its own migrate path, restored by five separate rehydrations that boot trusts blindly, with the transport store issuing engine commands from inside `onRehydrateStorage`.
The five migrate paths overlap the import-path migrators, the keys can version-skew against each other, and the dirty baseline (`cleanPreset`) dies on every reload because it alone is not persisted.
Greenfield, the session is a document: a debounced autosave writes `snapshot()` to one session key, and boot restores it through the same decode-migrate-validate-apply pipeline as a file import.
The five musical persists disappear, the rehydration side effects disappear, and "boot trusts localStorage blindly" is closed structurally rather than patched: a corrupt session document fails typed and falls back to init, instead of five keys partially rehydrating around each other.
Dirty tracking becomes a persisted content hash of the last clean document stored next to the session key; `hasUnsavedChanges` compares `hash(snapshot())` against it and survives reload by construction.
UI preferences (night mode, debug, groove display, performance) keep their small per-store persists, and one tiny session-UI key keeps the selected variation, which decision 7 deliberately keeps out of presets.

### Library storage: documents under per-preset keys

The library stops being an array inside a store's persist blob (decision 14).
Today every library mutation rewrites the entire `drumhaus-preset-meta-storage` key, which reaches roughly 1.65 MB at the 100-preset cap with embedded kits, a single corrupt entry poisons the whole array, and no quota handling exists anywhere.
Greenfield, each saved preset is its own entry (`drumhaus.preset.<id>`) holding the storage encoding of the document, plus a small index key for ordering.
Kit-by-reference shrinks a typical entry from ~16.5 KB to a few KB, writes touch one entry at a time, `QuotaExceededError` is caught per save as a typed `StorageFull` error, corruption quarantines per entry, and migration runs per entry through the standard pipeline.
The backend stays localStorage behind a thin async storage interface; IndexedDB is not justified by capacity today and slots in behind the same interface only if custom samples ever ship blobs (decision 8).

### Test spine

A fixture corpus drives everything: historical `.dh` files mined from git at each format transition, legacy share URLs, current-version documents, and deliberately corrupt variants.
Golden tests assert that each fixture migrates to a pinned canonical document (exact expected domain values) or fails with the expected typed error.
Property tests pin the codec algebra: `decode(encode(doc))` is identity for every encoding, `snapshot()` after `apply(doc)` equals `doc`, and every knob mapping round-trips knob-to-domain-to-knob within knob resolution.
Because every ingress shares one pipeline, the corpus covers boot restore, file import, share links, and library loads by construction.

### Cleanups

Delete the dead `ShareablePreset`/`patterns.ts` format and fix the stale comments in `serialization/index.ts`; delete the stale `scripts/new-kit.ts` (kit authoring is manual until a new kit actually lands, at which point a fresh script can be written against `src/core/dhkit/`); remove the dead `durations` surface; add `superDreamHaus` to `getDefaultPresets()` or delete the file; remove the unused `INSTRUMENT_TUNE_RANGE` constant the mapping audit flagged as diverging from the live tune curve.

## Migration path

The greenfield design is reached incrementally; each PR is independently shippable, and PR 1 gates the rest.

### PR 1: document schema, codecs, and fixture corpus (no behavior change)

Add the document model, zod schemas, typed error taxonomy, and `domainToKnob` inverses; land the fixture corpus; wire file and URL import through the decoder behind the existing toasts, still applying via the legacy `loadPreset`.
Risk: an over-strict schema rejecting in-the-wild files that previously loaded via silent defaults; mitigated by modeling every observed legacy shape in the corpus before enforcement.

### PR 2: the v2 document and the 1-to-2 migration

Introduce `CURRENT_VERSION = 2` (decisions 11, 12, and 15) and fold the legacy heuristics, the frozen-curve knob-to-domain conversion, the kit dereference, the swing conversion, and the macro folding into the single 1-to-2 migration; dual-read versions 1 and 2, write version 2.
Risk: the highest-risk PR of the series.
Old builds hard-reject v2 files with a clean error (intended, decision 1); beyond that, a wrong or non-invertible mapping would corrupt the sound of every migrated preset, so the corpus pins exact expected domain values for every historical file and the round-trip property test gates the inverses.

### PR 3: snapshot/apply pipeline

Replace `loadPreset` with `apply(document)` and `getCurrentPreset` with `snapshot()`; unify file import, share URL, library select, and delete-fallback onto the pipeline with one error boundary; surface kit-load failure with rollback and notify (decision 5).
Risk: touches the store/bridge boundary; gated by the golden render tests, new pipeline tests, and the untouched engine `loadSeq` semantics.

### PR 4: compact codec v2

The versioned compact encoder and decoder over the document, with stable kit ids; delete the legacy versionless decoder (decision 4).
Risk: every previously shared link stops resolving and falls back to init with an error toast; this is a deliberate, accepted break.

### PR 5: session document

Debounced `snapshot()` autosave to the session key; boot restore through the pipeline; retire the five musical persists via a one-time adopter that assembles a session document from the legacy keys (using the v1 migrators) on first boot and deletes them only after a successful session-document write; persist the clean-document hash for reload-stable dirty tracking; extend unsaved-changes checks to file import and share-link loads (no `beforeunload`, decision 6).
Risk: the riskiest wiring change of the series, since it replaces the boot path; mitigated by the adopter's delete-only-after-write ordering, the strict-mode-safe single-run guard pattern already proven in `loadFromUrlOrDefault`, and the pipeline tests.

### PR 6: library storage

Per-preset entries behind the async storage interface; adopt the legacy `customPresets` array into entries, quarantining what fails to parse rather than deleting it; per-save quota handling.
Risk: highest user-data sensitivity of the series; mitigated by quarantine-never-delete plus a pre-adoption raw export escape hatch.

### PR 7: cleanups

Dead compact format, stale kit script, dead `durations`, unlisted default preset, unused tune-range constant.
Risk: none.

## Decisions

The ten open questions from the initial draft were resolved in review on 2026-07-14; decisions 11 and 12 were added in the same review, and decisions 13 through 15 in the greenfield redesign that followed.
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
11. **Parameter values: domain units, not knob positions.**
    This reverses the initial draft's keep-knob-space stance: the file format should be UI-agnostic and coupled to the audio engine, which thinks in musical values, so the v2 schema stores the engine's domain vocabulary and knob positions are derived at load via inverse mappings.
    The stores and bridge stay knob-space; only the serialization boundary changes.
    The 1-to-2 migration bakes the current knob curves in as the permanent interpretation of v1 files, and from v2 on a curve retune is a pure UI concern that can never change how a saved preset sounds, which retires the retune-means-version-bump policy the draft had proposed instead.
    Alternatives rejected: keeping knob space with that policy (leaves the format UI-coupled), and making the stores themselves domain-native (relocates mapping into every knob component, against the engine refactor's bridge-boundary rule).
12. **Kit storage: reference by stable id, not embedded.**
    Review asked whether the embed survives first-principles scrutiny without the legacy code, and it does not.
    The file is not self-contained regardless (samples live in the app bundle and are referenced by path), stable ids already solve reordering, and the embed denormalizes registry data into every preset so upstream fixes never propagate.
    v2 stores a kit id plus the eight instrument-param objects, matching the model the compact format already proved; the file and share formats become one data model with two encodings.
    The corollary is the kit registry contract: published kit ids are immutable, sonic content never changes under an existing id, and retired kits stay resolvable.
    If custom samples ever ship (decision 8), the kit field grows into a discriminated union with an inline variant instead of retrofitting a second format.
13. **Session persistence: one document, not five store persists.**
    The greenfield redesign replaces the per-store Zustand persistence of musical state (instruments, sequencer, transport, master-chain, preset-meta) with a debounced autosave of the canonical document, restored at boot through the same pipeline as a file import.
    Rationale: five independently versioned keys can skew against each other, their migrate paths duplicate the import migrators, boot trusts them blindly, and the non-persisted dirty baseline breaks on every reload; one document closes all four structurally.
    UI preferences keep their small per-store persists, and a tiny session-UI key keeps the selected variation, which decision 7 deliberately keeps out of presets.
14. **Library storage: per-preset entries behind an async interface, localStorage backend.**
    Each saved preset becomes its own storage entry rather than an element of a single array that reaches ~1.65 MB at the cap and is rewritten in full on every mutation; corruption quarantines and migrates per entry, and quota errors surface per save.
    IndexedDB is not justified by capacity (entries are a few KB after kit-by-reference) and waits behind the same interface until custom samples ever ship blobs.
15. **Document units where mappings are not clean functions.**
    Split filters store the engine's own 0-100 position (the Hz value is non-bijective across the LP/HP split); saturation and reverb store one normalized macro amount each (one control fans out to two engine fields by a fixed engine-side recipe); volume fields are nullable dB (JSON has no `-Infinity`, so `null` means silence); tune stores a semitone offset rather than Hz (Hz bakes in the sample's base pitch); comp ratio stores the quantized integer; swing stores the 0..0.5 engine fraction.
    These refine decision 11: "domain units" means the engine's semantic surface, which for macro controls is one normalized amount, not a raw pair of internal fields.
