import { loadKit } from "@/core/dhkit";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";

/**
 * Deterministic "dense" knob-space preset (legacy PresetFileV1, 0-100 knob
 * space): every channel param, every master param, bpm, swing, a 3-step chain
 * with chainEnabled, and per-step accents/ratchets/flams/nudges/velocities are
 * all off-default, on kit-3.
 *
 * A synthetic legacy document, not a frozen wire fixture. It is migrated to a
 * canonical document to seed the dense share round-trip and KIT_ORDER-
 * independence tests (`url-codec.test.ts`, `url-codec-reorder.test.ts`) and to
 * exercise the document migration ladder (`library/adoption.test.ts`). Built
 * directly in the knob shape so it exercises the v1 -> canonical migration.
 */
function buildDenseSharePreset(): PresetFileV1 {
  const kit = loadKit("kit-3");
  if (!kit) throw new Error("kit-3 missing from registry");

  const pattern = createEmptyPattern();
  for (let v = 0; v < 8; v++) {
    for (let q = 0; q < 4; q++) {
      const seq = pattern.voices[v].variations[q];
      for (let s = 0; s < 16; s++) {
        seq.triggers[s] = (s + v + q) % 3 === 0;
        seq.velocities[s] = 1;
        seq.ratchets[s] = false;
        seq.flams[s] = false;
      }
      seq.velocities[(v + q) % 16] = 0.35;
      seq.timingNudge = (((v + q) % 5) - 2) as -2 | -1 | 0 | 1 | 2;
      seq.ratchets[(v + 2 * q) % 16] = true;
      seq.flams[(v + 3 * q + 1) % 16] = true;
    }
  }
  for (let q = 0; q < 4; q++) {
    const accent = pattern.variationMetadata[q].accent;
    for (let s = 0; s < 16; s++) {
      accent[s] = s % 4 === q;
    }
  }

  return {
    kind: "drumhaus.preset",
    version: 1.5,
    meta: {
      id: "6f9b1c22-0d4e-4b9a-9c33-7d1a2e5b8f40",
      name: "Dense Fixture",
      createdAt: "2026-07-14T00:00:00.000Z",
      updatedAt: "2026-07-14T00:00:00.000Z",
    },
    kit: {
      kind: "drumhaus.kit",
      version: 2,
      meta: kit.meta,
      instruments: kit.instruments.map((instrument, i) => ({
        meta: instrument.meta,
        role: instrument.role,
        sample: instrument.sample,
        params: {
          decay: 5 + i * 12,
          filter: 12 + i * 11,
          // Channel 0 at knob 0 pins the null (silence) volume spelling.
          volume: i === 0 ? 0 : 20 + i * 9,
          pan: 4 + i * 13,
          tune: 6 + i * 12,
          solo: i === 2,
          mute: i === 5,
        },
      })),
    },
    transport: { bpm: 137, swing: 64 },
    sequencer: {
      pattern,
      chain: {
        steps: [
          { variation: 0, repeats: 2 },
          { variation: 1, repeats: 1 },
          { variation: 3, repeats: 3 },
        ],
      },
      chainEnabled: true,
    },
    masterChain: {
      filter: 31,
      saturation: 22,
      phaser: 45,
      reverb: 61,
      compThreshold: 40,
      compRatio: 70,
      compAttack: 35,
      compMix: 55,
      // Knob 0 pins the null (silence) master volume spelling.
      masterVolume: 0,
    },
  };
}

export { buildDenseSharePreset };
