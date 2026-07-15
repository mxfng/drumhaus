/**
 * Swing AUDITION harness for issue #269 - NOT a regression test.
 *
 * Renders WAV artifacts into audition-out/ (gitignored) so the shipped
 * swing curve can be auditioned by ear against the MPC reference ladder
 * and the TR-909 detents. Gated behind VITE_AUDITION so it never runs in
 * CI or in a plain `pnpm test`.
 *
 * Run with:
 *   VITE_AUDITION=1 npx vitest run --project browser \
 *     src/test/audition/swing-audition.browser.test.ts
 *
 * Musical material: closed hat on all 16 steps, kick on 0/4/8/12, snare on
 * 4/12, real kit-0 samples, 95 BPM, 4 bars per render.
 *
 * Swing values are set in DOMAIN units directly on a single throwaway
 * engine (built once via createFixtureEngine). Values above the compiled
 * clamp TRANSPORT_SWING_MAX (0.375 since the #269 retune) are written to
 * the retained private `swing` field - renderWav reads it unclamped and
 * Tone accepts 0-1 - so the reference ladder can render beyond the
 * production ceiling without source changes.
 */

import { getContext } from "tone/build/esm/index";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { server } from "vitest/browser";

import { transportSwingKnobToDomain } from "@/core/audio/bridge/knob-to-domain";
import type { AudioEngine } from "@/core/audio/engine";
import { TRANSPORT_SWING_MAX } from "@/core/audio/engine/constants";
import { encodeWav } from "@/core/audio/export/wav-encoder";
import { findOnsets } from "@/test/analysis";
import { makeInstrument, makePattern } from "@/test/fixtures";
import { createFixtureEngine } from "@/test/render";

const BPM = 95;
const BARS = 4;
/** Duration of one 16th note at 95 BPM. */
const STEP = 60 / BPM / 4;
const OUT_DIR = "audition-out";
/** Per-render timeout headroom: offline render of ~10s of audio + sampler loads. */
const RENDER_TIMEOUT = 300_000;

/** Knob positions to audition on the shipped curve. */
const KNOBS = [0, 25, 50, 67, 85, 100];

/**
 * MPC reference ladder: fixed domain swing values. Values above the
 * production ceiling (0.375) render via the retained-field escape hatch
 * for by-ear comparison against what the clamp gives up.
 */
const REF_SWINGS = [0, 0.125, 0.25, 0.375, 0.5, 0.6, 0.75];

/**
 * Domain swing -> MPC-style percentage label. MPC% maps 50% (straight) to
 * 62.5% at Tone swing 0.375 and 75% at 0.75: pct = 50 + (100 / 3) * s.
 * One decimal, trailing ".0" stripped (e.g. "56.3", "70").
 */
function mpcLabel(s: number): string {
  const pct = Math.round((50 + (100 / 3) * s) * 10) / 10;
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

/**
 * Sets the swing retained by the engine in DOMAIN units. Values within the
 * production clamp go through the real command; values above it (audition
 * only) are written to the retained field directly, which renderWav reads
 * unclamped.
 */
function setEngineSwing(engine: AudioEngine, s: number): void {
  if (s <= TRANSPORT_SWING_MAX) {
    engine.setSwing(s);
  } else {
    (engine as unknown as { swing: number }).swing = s;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Fetches a real kit sample served from public/ and wraps it in a blob URL. */
async function fetchSampleUrl(path: string): Promise<string> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to fetch sample ${path}: ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}

/**
 * Measures the mean delay of the odd 16th steps against the straight grid,
 * using step 0's onset as the timing anchor (absolute onsets carry a small
 * constant master-chain latency, so only relative positions are meaningful).
 * Swing only delays, and never past the next even step, so matches are
 * accepted in [-STEP/4, 0.75*STEP] around the nominal grid time.
 */
function measureOddStepOffset(buffer: AudioBuffer): number {
  const onsets = findOnsets(buffer, { threshold: 0.04, refractoryMs: 20 });
  expect(onsets.length).toBeGreaterThan(32);
  const t0 = onsets[0];

  const offsets: number[] = [];
  for (let step = 1; step < BARS * 16; step += 2) {
    const nominal = t0 + step * STEP;
    let best = Number.POSITIVE_INFINITY;
    for (const t of onsets) {
      const d = t - nominal;
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    if (best >= -STEP / 4 && best <= 0.75 * STEP) {
      offsets.push(best);
    }
  }
  expect(offsets.length).toBeGreaterThan(16);
  return offsets.reduce((a, b) => a + b, 0) / offsets.length;
}

describe.runIf(!!import.meta.env.VITE_AUDITION)(
  "swing audition renders (issue #269)",
  () => {
    let engine: AudioEngine;

    beforeAll(async () => {
      const sampleUrls = await Promise.all([
        fetchSampleUrl("/samples/0/kick.wav"),
        fetchSampleUrl("/samples/0/snare.wav"),
        fetchSampleUrl("/samples/0/hat.wav"),
      ]);
      engine = await createFixtureEngine({
        pattern: makePattern({
          steps: [
            ...[0, 4, 8, 12].map((step) => ({ voice: 0, step })),
            ...[4, 12].map((step) => ({ voice: 1, step })),
            ...Array.from({ length: 16 }, (_, step) => ({ voice: 2, step })),
          ],
        }),
        instruments: [
          makeInstrument(0, "kick"),
          makeInstrument(1, "snare"),
          makeInstrument(2, "hat"),
        ],
        sampleUrls,
        bpm: BPM,
        swing: 0,
      });
    }, 120_000);

    afterAll(() => {
      engine?.dispose();
    });

    async function renderToFile(
      s: number,
      filename: string,
    ): Promise<AudioBuffer> {
      setEngineSwing(engine, s);
      const buffer = await engine.renderWav({
        bars: BARS,
        sampleRate: getContext().sampleRate,
        includeTail: false,
      });
      const wav = encodeWav(buffer);
      await server.commands.writeFile(
        `${OUT_DIR}/${filename}`,
        arrayBufferToBase64(wav),
        "base64",
      );
      expect(wav.byteLength).toBeGreaterThan(100_000);
      return buffer;
    }

    it(
      `renders the shipped curve at knob ${KNOBS.join("/")}`,
      async () => {
        for (const k of KNOBS) {
          const s = transportSwingKnobToDomain(k);
          await renderToFile(
            s,
            `swing-shipped-knob${k}-mpc${mpcLabel(s)}-${BPM}bpm.wav`,
          );
        }
      },
      RENDER_TIMEOUT,
    );

    it(
      "renders the MPC reference ladder and sanity-checks odd-16th offsets",
      async () => {
        const buffers = new Map<number, AudioBuffer>();
        for (const s of REF_SWINGS) {
          buffers.set(
            s,
            await renderToFile(s, `swing-ref-mpc${mpcLabel(s)}-${BPM}bpm.wav`),
          );
        }

        // Tone applies swing as offset = s * (1/6) * (60 / BPM) seconds on
        // the odd 16ths (see golden-render.browser.test.ts derivation).
        const expected = (s: number) => s * (1 / 6) * (60 / BPM);

        const measured667 = measureOddStepOffset(buffers.get(0.5)!);
        const measured75 = measureOddStepOffset(buffers.get(0.75)!);
        const report = [
          `mpc66.7 (s=0.5): measured ${measured667.toFixed(4)}s, expected ${expected(0.5).toFixed(4)}s`,
          `mpc75 (s=0.75): measured ${measured75.toFixed(4)}s, expected ${expected(0.75).toFixed(4)}s`,
        ].join("\n");
        console.log(`[audition]\n${report}`);
        await server.commands.writeFile(
          `${OUT_DIR}/onset-check.txt`,
          `${report}\n`,
          "utf-8",
        );

        expect(Math.abs(measured667 - expected(0.5))).toBeLessThan(0.008);
        expect(Math.abs(measured75 - expected(0.75))).toBeLessThan(0.008);
        expect(measured75).toBeGreaterThan(measured667);
      },
      RENDER_TIMEOUT,
    );

    /**
     * TR-909-style discrete shuffle: seven detents where detent n maps to
     * Tone swing s = n/16 (n = 0..6, max s = 0.375 = MPC 62.5% =
     * TRANSPORT_SWING_MAX, the shipped ceiling). Detent 0 is straight
     * (identical to the mpc50 renders), so only the six nonzero detents
     * are rendered. All values sit within the production clamp, so plain
     * engine.setSwing applies.
     */
    describe("909-style detents", () => {
      it(
        "renders detents 1-6 and sanity-checks detent 6",
        async () => {
          let detent6Buffer: AudioBuffer | undefined;
          for (let n = 1; n <= 6; n++) {
            const s = n / 16;
            const buffer = await renderToFile(
              s,
              `swing-909-detent${n}-mpc${mpcLabel(s)}-${BPM}bpm.wav`,
            );
            if (n === 6) detent6Buffer = buffer;
          }

          const s6 = 6 / 16;
          const expected6 = s6 * (1 / 6) * (60 / BPM);
          const measured6 = measureOddStepOffset(detent6Buffer!);
          const report =
            `909 detent6 (s=${s6}): measured ${measured6.toFixed(4)}s, ` +
            `expected ${expected6.toFixed(4)}s`;
          console.log(`[audition] ${report}`);
          await server.commands.writeFile(
            `${OUT_DIR}/onset-check-909.txt`,
            `${report}\n`,
            "utf-8",
          );
          expect(Math.abs(measured6 - expected6)).toBeLessThan(0.008);
        },
        RENDER_TIMEOUT,
      );
    });
  },
);
