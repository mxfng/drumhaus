# .dh preset fixture corpus

Historical and synthetic `.dh` preset files for schema and migration tests.
All real fixtures are the `init` preset extracted from git history, so diffs between eras are meaningful.
The `.dh` JSON format was born at commit `78fe632b` (2025-11-18); before that, presets were TypeScript modules under `src/lib/presets/*.ts` and there is no earlier file era to capture.
Truncated or otherwise invalid JSON should be tested inline as a string literal in the test, not as a fixture file, because editors and formatters will not preserve broken JSON on disk.

Migrators referenced below live in `src/features/sequencer/lib/migrations.ts` unless noted otherwise.
`legacyCycleToChain` lives in `src/features/sequencer/lib/chain.ts` and is applied by `src/features/preset/hooks/use-preset-loading.ts`.

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
Primary trait: `sequencer.variationCycle` instead of `chain`/`chainEnabled`, handled by `legacyCycleToChain` in `src/features/sequencer/lib/chain.ts` via `use-preset-loading.ts`.
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

## future-version.json

Source: synthetic (modern `v1-current.json` with `version` changed to `2`).
Exercises envelope validation: a document with a `version` newer than the reader supports must be rejected or handled explicitly, not silently parsed.
Note the knob-space reader accepts versions 1 and 1.5 (the #269 swing revision); version 2 is the domain-unit preset document, which has a different shape, so a v1-shaped file stamped `2` must be rejected.

## missing-sequencer.json

Source: synthetic (modern `v1-current.json` with the top-level `sequencer` key deleted).
Exercises structural validation: the envelope (`kind`, `version`, `meta`) is valid but a required top-level section is absent.

## malformed-pattern.json

Source: synthetic (modern `v1-current.json` with `sequencer.pattern.voices` replaced by the string `"corrupted"`).
Exercises `migratePatternUnsafe` / `isValidPattern` rejection paths: `voices` exists but is not an array, so pattern migration must throw rather than crash downstream.
