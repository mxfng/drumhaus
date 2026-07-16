# Share-URL fixtures

The share codec is latest-only: it reads and writes exactly the single current `COMPACT_CODEC_VERSION` and refuses every other `v` (older v1.5 links and versionless pre-#269 links) with `UnsupportedVersionError` (#373).
Because no legacy share payload is decoded anymore, there are no frozen legacy `?p=` fixtures to pin; a current-version round trip is exercised directly in `url-codec.test.ts`.

## `dense-preset.ts`

`buildDenseSharePreset()` builds a deterministic dense `PresetFileV1` (0-100 knob space) with every channel param, every master param, bpm 137, swing knob 64, a 3-step chain (A2 B1 D3) with chain enabled, kit-3, and per-step velocities/nudges/ratchets/flams/accents.
It is a synthetic legacy document, not a frozen fixture: `url-codec.test.ts` migrates it to a canonical document to seed dense round-trip and KIT_ORDER-independence cases, and `library/adoption.test.ts` uses it to exercise the document migration ladder.
