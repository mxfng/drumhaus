# Share-URL fixture corpus

Frozen `?p=` payload strings for the compact share codec, used by `url-codec.test.ts` to prove that links shared by older builds keep decoding after codec changes.

## v1.5 fixtures

Generated on branch `feat/compact-codec-v2` at commit `71282c816f4c5ce76d2490e7f9437b12d154ce89` (2026-07-14), by passing the presets below through the then-current `shareablePresetToUrl` (v1.5 knob-space compact codec, gzip, base64url).
Do not regenerate casually: their whole value is that the bytes are what a v1.5 build actually emitted.

- `share-v1_5-init.txt` - `init()` (the bundled `init.dh`) encoded as-is.
  Must decode to the migrated init document: kit `kit-0`, bpm 100, swing fraction 0, default channels (volumeDb 0 dB, pan 0, tune 0 semitones), single-step chain A1 with chain disabled.
- `share-v1_5-dense.txt` - the preset built by `dense-preset.ts` (`buildDenseSharePreset()`), which sets every channel param, every master param, bpm 137, swing knob 64, a 3-step chain (A2 B1 D3) with chain enabled, kit-3, and per-step velocities/nudges/ratchets/flams/accents.
  Must decode to `migrateV1ToDocument(buildDenseSharePreset())`: kit `kit-3`, bpm 137, swing fraction 0.24 (v1.5 knob 64 through the v1.5 interpretation), channel 0 volumeDb null, master volume null, compRatio 6.

`dense-preset.ts` is the frozen source of the dense fixture; see the warning in its doc comment.
