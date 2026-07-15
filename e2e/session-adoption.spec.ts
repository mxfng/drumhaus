import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

import { step, waitForAppReady } from "./helpers";

/**
 * One-time legacy session adoption (docs/preset-persistence.md, PR 5): a
 * first boot after the session-document release finds the five retired
 * per-store zustand persist envelopes, replays their migrations into one
 * session document, and deletes the four retired musical keys only after
 * the session write lands.
 *
 * The seeded envelopes are byte-shaped exactly as the old persist configs
 * wrote them ({ state, version } JSON; shapes taken from the retired store
 * code in git history):
 * - instruments v2 (post release->decay/pitch->tune rename),
 * - sequencer v3 (modern pattern + chain),
 * - transport pre-#269 (v0: swing knob under the old curve, exercising the
 *   4/3 swing replay),
 * - master-chain (never versioned),
 * - preset-meta v1 (currentPresetMeta/currentKitMeta still in the envelope).
 */

const SESSION_KEY = "drumhaus-session";
const RETIRED_KEYS = [
  "drumhaus-instruments-storage",
  "drumhaus-sequencer-storage",
  "drumhaus-transport-storage",
  "drumhaus-master-chain-storage",
];
const PRESET_META_KEY = "drumhaus-preset-meta-storage";
const LIBRARY_BACKUP_KEY = "drumhaus-library-backup";

/** A silent 16-step sequence, as every era of the store persisted it. */
function emptySequence() {
  return {
    triggers: Array.from({ length: 16 }, () => false),
    velocities: Array.from({ length: 16 }, () => 1),
    timingNudge: 0,
    ratchets: Array.from({ length: 16 }, () => false),
    flams: Array.from({ length: 16 }, () => false),
  };
}

/** The modern persisted Pattern shape with voice 0's step 3 active in A. */
function legacyPattern() {
  const pattern = {
    voices: Array.from({ length: 8 }, (_, instrumentIndex) => ({
      instrumentIndex,
      variations: [
        emptySequence(),
        emptySequence(),
        emptySequence(),
        emptySequence(),
      ],
    })),
    variationMetadata: Array.from({ length: 4 }, () => ({
      accent: Array.from({ length: 16 }, () => false),
    })),
  };
  pattern.voices[0].variations[0].triggers[3] = true;
  return pattern;
}

test.describe("legacy session adoption", () => {
  test("adopts the five retired persist envelopes into one session document", async ({
    page,
  }) => {
    // A real kit's instruments make the instruments envelope byte-faithful
    // to what the old store persisted (the store shape and the .dhkit
    // instrument shape are identical).
    const kit = JSON.parse(
      readFileSync(
        new URL("../src/core/dhkit/defaults/808.dhkit", import.meta.url),
        "utf-8",
      ),
    ) as {
      meta: Record<string, unknown>;
      instruments: unknown[];
    };

    const legacyState: Record<string, unknown> = {
      "drumhaus-instruments-storage": {
        state: { instruments: kit.instruments },
        version: 2,
      },
      "drumhaus-sequencer-storage": {
        state: {
          pattern: legacyPattern(),
          variation: 0,
          chain: { steps: [{ variation: 0, repeats: 1 }] },
          chainEnabled: false,
        },
        version: 3,
      },
      // Pre-#269: zustand persisted no version field before the transport
      // store configured one; swing knob 60 under the old curve must replay
      // to knob 80 (60 * 4/3) to keep the feel.
      "drumhaus-transport-storage": {
        state: { bpm: 128, swing: 60 },
      },
      // The master-chain persist was never versioned (zustand writes 0).
      "drumhaus-master-chain-storage": {
        state: {
          filter: 50,
          saturation: 0,
          phaser: 0,
          reverb: 45,
          compThreshold: 100,
          compRatio: 50,
          compAttack: 50,
          compMix: 70,
          masterVolume: 92,
        },
        version: 0,
      },
      [PRESET_META_KEY]: {
        state: {
          currentPresetMeta: {
            id: "e2e-legacy-preset",
            name: "Legacy Groove",
            createdAt: "2025-11-20T12:00:00.000Z",
            updatedAt: "2025-11-20T12:00:00.000Z",
          },
          currentKitMeta: kit.meta,
          customPresets: [],
        },
        version: 1,
      },
    };

    await page.addInitScript((entries: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }, legacyState);

    await page.goto("/");
    await waitForAppReady(page);

    // The adopted session is what the user had: their preset name, kit,
    // pattern, and tempo.
    await expect(page.getByRole("combobox", { name: "Preset" })).toHaveText(
      "Legacy Groove",
    );
    await expect(page.getByRole("combobox", { name: "Kit" })).toHaveText("808");
    await expect(step(page, 3)).toHaveAttribute("data-active", "true");
    await expect(page.getByRole("slider", { name: "bpm" })).toContainText(
      "128",
    );

    // The pre-#269 swing knob replayed through the 4/3 rescale: 60 -> 80.
    // The knob value round-trips knob -> swing fraction -> knob through the
    // document, so compare numerically (float noise ~1e-14 is expected) and
    // pin the user-visible MPC swing display (50 + knob/8 = 60).
    const swingControl = page.getByRole("slider", { name: "swing" });
    await expect(swingControl).toHaveText(/swing\s+60/);
    const swingKnobValue = await swingControl.getAttribute("aria-valuenow");
    expect(Number(swingKnobValue)).toBeCloseTo(80, 9);

    // Storage after adoption: one session document, the four retired keys
    // deleted (only after the write landed). The legacy preset-meta key is
    // consumed by the PR 6 library adoption, which preserves its raw payload
    // under the backup key before retiring it.
    const storage = await page.evaluate(
      (keys: string[]) =>
        Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])),
      [SESSION_KEY, PRESET_META_KEY, LIBRARY_BACKUP_KEY, ...RETIRED_KEYS],
    );
    for (const key of RETIRED_KEYS) {
      expect(storage[key], `${key} should be deleted`).toBeNull();
    }
    expect(storage[PRESET_META_KEY]).toBeNull();
    expect(storage[LIBRARY_BACKUP_KEY]).not.toBeNull();
    expect(storage[SESSION_KEY]).not.toBeNull();

    // The written envelope is a v2 document carrying the adopted values in
    // domain units (reverb macro: knob 45 -> 0.45).
    const envelope = JSON.parse(storage[SESSION_KEY] as string) as {
      v: number;
      cleanHash: string | null;
      document: {
        version: number;
        meta: { name: string };
        kit: { id: string };
        transport: { bpm: number };
        master: { reverb: number };
      };
    };
    expect(envelope.v).toBe(1);
    expect(typeof envelope.cleanHash).toBe("string");
    expect(envelope.document.version).toBe(2);
    expect(envelope.document.meta.name).toBe("Legacy Groove");
    expect(envelope.document.kit.id).toBe("kit-0");
    expect(envelope.document.transport.bpm).toBe(128);
    expect(envelope.document.master.reverb).toBeCloseTo(0.45, 6);
  });
});
