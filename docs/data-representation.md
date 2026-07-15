# Musical data representation

Status: proposed (principles rubric; audit and fixes to follow).
Author: Max, July 2026.

## Why this exists

Drumhaus grew a working app, then two maturation pushes exposed that the same musical datum is held in several representations at once, bridged by conversion machinery, with UI encodings leaking down into the audio engine and knob values leaking up into persisted state.
The document-centric persistence work was elaborate largely because it was translating between a knob-space runtime and a domain-space format: it did half the transformation.
This document fixes the root cause in writing.
It defines the one canonical representation of each musical value, the layers each value legitimately passes through, and the principles that keep those layers from bleeding into each other.
It is the rubric the codebase is audited against; every violation is a tracked finding, and the fix PRs restore the principles.

## Approved decisions (2026-07-15)

- Canonical is Tone-native acoustic units with exactly two musical exceptions: pitch as semitones, filter as `{ side, cutoffHz }`.
- The engine is refactored so its filter takes derived frequencies, and is built to accommodate resonance (Q) as a real filter parameter; Q is not exposed to the user, not canonical, and not persisted now.
- There is no explicit filter bypass state; the center of the knob is the open extreme of a side.
- 0-100 is eliminated entirely; the knob is a best-in-class React primitive working in normalized [0, 1] internally and exposing only canonical values (see knob-primitive.md).
- Legacy handling is option A: the frozen legacy-read island stays, so every existing `.dh` file, share link, and saved session keeps loading forever.
  It is kept as small and hard-isolated as possible, in one clearly marked module, with a documented seam to sunset it in a future PR if desired.
- The refactor is behavior-preserving: no audible change except the deliberate, sound-identical filter refactor, gated by golden-render and e2e.
- Factory data is regenerated to canonical: `.dhkit` to `KitFileV2`, the eleven `.dh` defaults to v2 documents.

## The representation stack

A musical value passes through up to four representations.
Exactly one of them is canonical (persisted and held in memory); the others are projections that must never be persisted or held as a second source of truth.

1. **Engine / Tone-native.**
   What the Tone.js nodes actually consume: cutoff frequency in Hz, gain in dB, playback rate, an envelope release in seconds, a transport swing fraction.
   The acoustic truth of what is heard.

2. **Canonical / musical.**
   The single persisted, in-memory-authoritative form, held by the stores, the preset document, and the kit registry.
   It equals the engine-native value except where a musical representation is strictly more stable (see Principle 2).
   This is the only representation that is saved, loaded, shared, or diffed.

3. **Control position.**
   A knob or slider's input state, internal to the widget: a normalized [0, 1] scalar, the industry-standard transport (VST3 `getNormalized`/`setNormalized`, JUCE `convertTo0to1`).
   The widget maps position to and from canonical through a per-parameter descriptor.
   Never persisted, never held or exposed outside the widget; its encoding is an implementation detail, and 0-100 disappears from the codebase entirely.

4. **Display.**
   The human-readable string a user reads while adjusting a control: "2.0 kHz", "-6 dB", "62.5%", "LP".
   A pure function of the canonical value; never stored or round-tripped.

The conversions between layers each live at exactly one boundary:
canonical to engine at the bridge, position to and from canonical inside the widget, canonical to display in the formatter, and legacy to canonical at the isolated legacy-read boundary.

## Principles

These are the rubric.
Each is stated so that a place in the code either satisfies it or is a finding.

### P1. One canonical representation per datum.

Every musical value has exactly one authoritative form.
No value is stored in two representations kept in sync by conversion.
If a datum exists as both a knob value and a domain value that are reconciled by a mapping, that is a violation.

### P2. Canonical is acoustic units, Tone-native except for principled musical exceptions.

The canonical form is what the engine consumes, unless a musical representation is strictly more stable under changes that should not alter the datum.
Two exceptions qualify and are the only ones so far:
pitch is stored as a semitone offset, not Hz, because Hz bakes in the sample's base pitch;
the split filter is stored as `{ side, cutoffHz }`, not a UI position and not two raw node frequencies, because that is the musical intent and it survives curve retunes and node-topology changes.
The bar for a new exception is high: it must be provably more stable, not merely more convenient.

### P3. The engine is Tone-native.

The audio engine holds and consumes Tone.js-native parameters only.
No UI encoding appears inside the engine.
A 0-100 position, a knob value, or any UI-flavored scalar in an engine signature or engine-owned state is a violation.

### P4. Control position is confined to the widget.

The normalized [0, 1] position exists only inside the control component.
It never appears in a store, a document, the registry, an engine call, a file, or a share link.
The widget maps position to and from canonical through a per-parameter descriptor (see knob-primitive.md); its scalar encoding is a free implementation choice.

### P5. Display values are projections, never state.

Formatted, human-readable values are computed from the canonical value at render time.
They are never persisted, compared, or fed back as input.

### P6. One ingress pipeline; legacy formats never touch live state.

Every way a preset enters the app (file, share link, session restore, library, factory default) runs one decode, migrate, validate, apply pipeline.
Old formats are read only at an isolated legacy boundary that converts them to canonical immediately.
No legacy representation, and in particular no legacy knob value, ever reaches a store, the engine, or a new file.

### P7. Each conversion lives at one boundary, in the direction of flow.

canonical to engine is thin and lives at the bridge.
position to and from canonical lives in the widget.
canonical to display lives in the formatter.
legacy to canonical lives in the legacy-read island.
No conversion is duplicated across layers, and no datum crosses a boundary it does not need to.

## The knob primitive

The control layer (stack layer 3) is a single descriptor-driven primitive that exposes only canonical values, works in normalized [0, 1] internally, and eliminates 0-100 from the codebase.
Its full design (the `ParamDescriptor` model, the interaction set, and the reference implementations it draws on) lives in its own doc: [knob-primitive.md](./knob-primitive.md).
It is built as its own epic (Epic 2 below).

## Audit findings

A four-slice sweep (engine, stores and bridge, persistence and serialization, UI and widgets) scored the codebase against P1 through P7.
The result converged: every HIGH finding is one of the two root causes below, mapped to full blast radius, plus a tier of structural MED findings and cleanup.
No third systemic violation surfaced.
BPM is the one param already canonical end to end, and its two controls already convert position at the widget edge; it is the reference implementation for every fix.

### HIGH

- **V1. The split filter is a UI position masquerading as canonical, across every layer (P2, P3, P4, P7).**
  The engine consumes a 0-100 position and runs the position-to-frequency curve internally (`engine/fx/split-filter.ts`, `master-bus.ts:52,182-192,343`, `instrument/types.ts:29-30`, `instrument-channel.ts:192-201`).
  The document schema persists it as `filter: 0-100` (`document/document.ts:99-101,148-149`) and so does the v2 share codec (`compact-v2.ts`).
  The knob layer imports the curve back up out of the engine (`shared/knob/lib/transform.ts:6-11,78-82`).
  Canonical must be `{ side, cutoffHz }`; the engine takes derived frequencies; the curve lives in the filter widget.
  Fixed by PR B.

- **V2. Instrument, master, and swing params are 0-100 knob values in the stores (P1, P4).**
  Five instrument continuous params (`use-instruments-store.ts`, `instrument/types.ts:13-21`), the nine master params (`use-master-chain-store.ts:41-54`, which even types its state on the bridge's knob type), and transport swing (`use-transport-store.ts:33`) are positions, converted to canonical only downstream at the bridge.
  Sixteen widget instantiation sites bind a store field straight to a 0-100 prop and callback (`instrument-params-control.tsx`, `master-fx.tsx`, `master-compressor.tsx`, `master-volume.tsx`, `tempo-controls*.tsx` swing path).
  Fixed by PR C.

- **V3. The `.dhkit` registry stores knob params as canonical (P1, P4).**
  All ten kit files hold `params: { decay, filter, volume, pan, tune }` as 0-100 positions.
  Fixed by PR D.

- **V4. The eleven factory `.dh` presets are v1.5 knob-embedded (P1, P4, P6).**
  The app ships knob-space factory data and reads its own defaults through the frozen legacy island.
  Fixed by PR E.

### MED

- **V5. The legacy-read island is on the live path (P6, P7).**
  `snapshot.ts:36` runs `migrateV1ToDocument(getCurrentPreset(...))` - the frozen legacy-v1 curves - over live store state on every export, share, autosave, and dirty-hash.
  `apply.ts` runs the inverse (`documentToV1`) so a knob projection reaches live stores on every load.
  Two different knob-to-domain recipes (the bridge vs the frozen curves) exist for the same datum; a parity test and a nine-decimal hash rounding paper over their divergence today.
  All of this collapses to a direct canonical read/write once V2 lands.

- **V6. Knob-space default constants live in `engine/constants.ts` (P3, P4).**
  A block of `*_DEFAULT = 50/92/100` control positions (one literally commented "Knob position") and `TRANSPORT_SWING_RANGE: [0,100]` sit in engine-owned code that never consumes them.
  Move to the knob/store layer.

- **V7. Swing converts inside the store action, not at a boundary (P7).**
  `use-transport-store.ts:67-70` calls `transportSwingKnobToDomain` in `setSwing`, and `midi-export-form.tsx:96` is a second conversion site.
  Resolves when swing becomes canonical (V2).

- **V8. Display is projected from position, not canonical (P5).**
  The shared `format(value, knobValue)` signature threads the knob position into every formatter so `tuneMapping.format` and `splitFilterMapping.format` can read it (`shared/knob/lib/mapping.ts:176-180,206-212`, `types.ts:15-17`).
  Formatters take canonical only after V1/V2; the `knobValue` arg drops.

### LOW (cleanup, PR F)

- Dead low/high-pass mappings, their engine defaults, and their formatters (`mapping.ts:262-279`, `constants.ts:40-41`, `format.ts:24-36`).
- Four dead domain-to-knob inverses with only test consumers (`domain-to-knob.ts:139,174,189,69`).
- The nine-decimal canonical-hash rounding, obsolete once the apply-snapshot round trip is identity (`canonical-hash.ts`).
- Vestigial knob-space `getCurrentPreset` / `createPresetForExport` (`helpers.ts:20-50`, `operations.ts:41-53`).
- Stale doc comments (`document.ts:5-8`, `snapshot.ts:8-13`).
- One engine test reaching into `features/` (`engine/sequencer/precompute.test.ts:3`).

## Fix sequence

The audit runs against P1 through P7 and produces a ranked findings list.
The following PRs are already known; the audit may add or reprioritize.

- **B. Engine split filter to Tone-native.**
  Canonical filter becomes `{ side, cutoffHz }`; the engine consumes derived frequencies; the position curve moves to the widget; the document schema and the frozen legacy migration (old 0-100 to `{ side, cutoffHz }`) update.
  This lands before the store flip because the stores, document, registry, and widgets all key on the filter's shape.

- **C. Stores, widgets, and bridge to canonical units.**
  Every store holds canonical; the three shared widgets convert position at the edge like BPM already does; the bridge collapses to canonical-to-engine (semitone to Hz, filter derivation, master macro expansion) plus pass-through; `snapshot` reads canonical and `apply` writes it.

- **D. Kit registry to canonical.**
  The `.dhkit` files store canonical params; `KitFileV2`; `switchKit` and store initialization consume canonical directly.

- **E. Factory defaults to v2 documents.**
  The eleven bundled `.dh` presets are re-authored as v2 documents so the app ships what it writes.

- **F. Cleanup.**
  Delete the dead knob machinery (the bridge's knob-to-domain functions, the production domain-to-knob inverses, the knob-shaped `MasterChainParams` type, the legacy compact encoder, the dead low/high-pass mappings), recompute the canonical-hash noise floor, and name the legacy-read island explicitly.

## The legacy-read island

Reading genuinely old data stays knob-to-canonical at one boundary and never touches live state, exactly like reading any legacy format.
The permanent members are the `migrate-v1` frozen curves (old `.dh` files and embedded kits), the v1.5 compact decoder (old share links), the legacy swing rescale, and the legacy localStorage adopter.
Everything born after this work is canonical.

## Coverage and verification

Every requirement in this document is assigned to a PR and verified against that PR's diff before it merges.
The main coordinator checks each PR against the row below independently, not on a coordinator's report; a PR does not merge until its assigned findings are provably closed.

| Requirement                                  | PR                    | Proven closed by                                                                   |
| -------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------- |
| V1 split filter (P2, P3)                     | B                     | `{ side, cutoffHz }` in engine, document, and codec; golden-render sound-identical |
| V2 knob params in stores (P1, P4)            | C                     | stores hold canonical; no 0-100 in any store or the bridge                         |
| V5 legacy island on the live path (P6, P7)   | C                     | `snapshot` reads canonical; `migrate-v1` no longer on the live path                |
| V6 knob constants in the engine (P3, P4)     | C, F                  | removed from `engine/constants.ts`                                                 |
| V7 swing converts in a store action (P7)     | C                     | swing is canonical; `transportSwingKnobToDomain` gone                              |
| V8 display projected from position (P5)      | Epic 2 (new), F (old) | `format` takes canonical; the `knobValue` formatter arg deleted                    |
| V3 `.dhkit` knob params (P1, P4)             | D                     | `KitFileV2` with canonical params                                                  |
| V4 `.dh` defaults v1.5-embedded (P1, P4, P6) | E                     | re-authored current-version documents; no knob-embedded factory data               |
| LOW cleanup                                  | F                     | dead mappings, inverses, hash rounding, and stale comments removed                 |
| Knob primitive (knob-primitive.md)           | Epic 2                | descriptor model, interaction set, canonical-only API, tests                       |
| Approved decisions 1-7, principles P1-P7     | across B-F and Epic 2 | each closed finding restores its principle                                         |

Verification status: Epic 2 (PR #359) is verified and closes the knob-primitive row and V8's new-code half.
The remaining rows are open until their PR lands and is checked against this table.
