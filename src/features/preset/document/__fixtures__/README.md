# .dh preset fixture corpus

Historical and synthetic `.dh` preset files for schema and migration tests.
The v1-era real fixtures are the `init` preset extracted from git history, so diffs between eras are meaningful; the document-era fixtures (`v2-*`, `v2_1-*`) are a factory preset chosen for its varied filter positions (see below).
The `.dh` JSON format was born at commit `78fe632b` (2025-11-18); before that, presets were TypeScript modules under `src/lib/presets/*.ts` and there is no earlier file era to capture.
Truncated or otherwise invalid JSON should be tested inline as a string literal in the test, not as a fixture file, because editors and formatters will not preserve broken JSON on disk.

Migrators referenced below live in `src/features/sequencer/lib/migrations.ts` unless noted otherwise.
`legacyCycleToChain` lives in `src/features/sequencer/lib/chain.ts` and is applied by `src/features/preset/document/migrate-v1.ts` (the 1-to-2 document migration) and `src/features/preset/session/legacy-adopter.ts` (one-time adoption of pre-document session state).

## v1-current.json

Source: real, `HEAD:src/core/dh/defaults/init.dh` (last content change in commit `e2694c2d`, 2025-12-18).
Era: 2025-12-11 (commit `d74fd221`) to present.
Traits: none; this is the fully modern shape and must pass through every migrator unchanged.
It has `decay`/`tune` params, unified `filter` master chain with `saturation` and `compAttack`, `chain`/`chainEnabled` sequencer, and a `{ voices, variationMetadata }` pattern with 4 variations per voice carrying `timingNudge`, `ratchets`, and `flams`.

## v1-legacy-params.json

Source: real, commit `e0fab7dd` (2025-11-28), path `src/core/dh/defaults/init.dh`.
Era for the primary trait: 2025-11-18 (`78fe632b`) to 2025-12-04 (`ad24ab50` renamed the params).
Primary trait: instrument params use `attack`/`release`/`pitch` instead of `decay`/`tune`, handled by `migrateInstruments` / `migrateInstrumentParams`.
Also exercises: legacy master chain (`lowPass`/`highPass`, no `saturation`/`compAttack`), handled by `migrateMasterChainParams`.
Also exercises: `sequencer.variationCycle` instead of `chain`/`chainEnabled`, handled by `legacyCycleToChain`.
Also exercises: bare-array pattern with only 2 variations per voice and step sequences lacking `timingNudge`/`ratchets`/`flams`, handled by `migratePattern` / `migrateStepSequence` / `migrateVariationMetadata`.

## v1-legacy-master.json

Source: real, commit `ad24ab50` (V2 Redesign, 2025-12-04), path `src/core/dh/defaults/init.dh`.
Era for the primary trait: 2025-11-18 (`78fe632b`) to 2025-12-11 (`d74fd221` unified the filter).
Primary trait: `masterChain` has `lowPass` and `highPass` instead of the unified `filter`, and lacks `saturation` and `compAttack`, handled by `migrateMasterChainParams`.
Also exercises: `variationCycle` (handled by `legacyCycleToChain`) and the bare-array 2-variation pattern (handled by `migratePattern`).
Notably its instrument params are already modern (`decay`/`tune`), making this a mixed-era file that isolates the master chain and sequencer migrations from the params migration.

## v1-legacy-cycle.json

Source: synthetic (modern `v1-current.json` with `sequencer.chain`/`chainEnabled` replaced by `variationCycle: "AB"`).
Era for the primary trait: 2025-11-18 to 2025-12-11 in committed files, but this exact combination (modern pattern plus `variationCycle`) never existed as a factory `.dh` file and could only arise from mid-migration user state.
Primary trait: `sequencer.variationCycle` instead of `chain`/`chainEnabled`, handled by `legacyCycleToChain` in `src/features/sequencer/lib/chain.ts`.
The `"AB"` value is chosen deliberately because it maps to a non-trivial two-step chain with `chainEnabled: true`, unlike `"A"` which degenerates to the default chain.
All other sections are fully modern so this fixture isolates the cycle-to-chain migration.

## v1-legacy-pattern-array.json

Source: real, commit `78fe632b` (2025-11-18, the first commit ever to contain a `.dh` file), path `src/lib/preset/defaults/init.dh`.
Era for the primary trait: 2025-11-18 (`78fe632b`) to 2025-12-11 (`d74fd221` introduced `{ voices, variationMetadata }`).
Primary trait: `sequencer.pattern` is a bare `Voice[]` array with no `variationMetadata`, only 2 variations per voice, and step sequences containing only `triggers` and `velocities` (no `timingNudge`, `ratchets`, or `flams`), handled by `migratePattern` / `migrateStepSequence` / `migrateVariationMetadata` / `normalizeVariations`.
Also exercises: legacy `attack`/`release`/`pitch` params (handled by `migrateInstruments`) and `variationCycle` (handled by `legacyCycleToChain`).
Also exercises: the oldest master chain variant, which spells the high-pass knob `hiPass` (renamed to `highPass` in `0499fedb`, 2025-11-20) and lacks `compMix` (added in `ed61f81f`, 2025-11-23).
Caution: `migrateMasterChainParams` only reads `highPass`, so a nonzero `hiPass` value from this two-day era is silently dropped and treated as 0; this fixture has `hiPass: 0` so the behavior is benign here, but tests may want to pin that down.

## wrong-kind.json

Source: synthetic (modern `v1-current.json` with `kind` changed to `"drumhaus.kit"`).
Exercises envelope validation: a structurally valid document whose `kind` is not `"drumhaus.preset"` must be rejected before any migrator runs.

## unsupported-version.json

Source: synthetic (modern `v1-current.json` with `version` changed to `99`).
Exercises envelope validation: a document with a `version` newer than any reader supports must be rejected or handled explicitly, not silently parsed.
Version 99 is beyond every known era (the knob-space reader accepts 1 and 1.5; the document decode path additionally handles 2 and 2.1), so this file is genuinely unsupported and must be rejected on read.

## missing-sequencer.json

Source: synthetic (modern `v1-current.json` with the top-level `sequencer` key deleted).
Exercises structural validation: the envelope (`kind`, `version`, `meta`) is valid but a required top-level section is absent.

## malformed-pattern.json

Source: synthetic (modern `v1-current.json` with `sequencer.pattern.voices` replaced by the string `"corrupted"`).
Exercises `migratePatternUnsafe` / `isValidPattern` rejection paths: `voices` exists but is not an array, so pattern migration must throw rather than crash downstream.

## v2-super-dream-haus.json

Source: real, git-mined. Emitted by the version-2-era migration (`migrateV1ToDocument` + `encodePresetDocument` at commit `78c98823`, 2026-07-16, the last commit before the canonical-filter flip `6af95dd5`) applied to that era's factory preset `src/core/dh/defaults/Super Dream Haus.dh`.
Era: 2026-07-15 (document epic, #350-#354) to 2026-07-16 (the 2.1 canonical-filter flip, #357/#361).
Primary trait: a version-2 domain document - every field is already domain-space (dB, seconds, semitones, -1..1 pan) EXCEPT the split filter, which is still persisted as its scalar 0-100 position (channels `[13, 54, 53, 37, 58, 39, 65, 26]`, master `51`). Handled by `migrate-v2.ts`, which converts each position to canonical `{ side, cutoffHz }` with the frozen curve and re-validates against the strict v2.1 schema.
Chosen over `init` deliberately: `init` (and most factory presets) sit at filter position 50, which converts to a single degenerate cutoff; "Super Dream Haus" spans both the low-pass (13, 37, 39, 26) and high-pass (54, 53, 58, 65, 51) sides, so the conversion is meaningfully exercised across the split. Its expected canonical values are pinned as literals in `corpus.test.ts`.
This same document-era pair gates the #382 session/library adoption ladder.

## v2_1-super-dream-haus.json

Source: real, git-mined. The v2.1 target of `v2-super-dream-haus.json`: the same document after the frozen position -> `{ side, cutoffHz }` filter conversion, with `version` bumped to 2.1. Every non-filter field is byte-identical to the v2 fixture.
Era: 2026-07-16 (the 2.1 flip, #357/#361) to present.
Primary trait: the current, strictly-parsed document shape - the split filter is canonical `{ side, cutoffHz }`, so this file is read by the strict v2.1 schema with no migration. `corpus.test.ts` asserts it decodes to exactly the document `v2-super-dream-haus.json` migrates to, so the pair cannot drift apart.
