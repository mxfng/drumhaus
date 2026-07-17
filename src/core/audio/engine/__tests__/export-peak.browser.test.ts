/**
 * Export headroom regression test (issue #346).
 *
 * The production full-mix render of the stock preset "A Drum Called Haus"
 * used to peak at +1.23 dBFS: Tone's Limiter is a DynamicsCompressorNode
 * with ratio 20, a 3ms attack, and the knee left at the node's default
 * 30 dB - the soft knee spans [threshold, threshold + 30 dB], so around
 * 0 dBFS it applies almost no gain reduction and transient-heavy material
 * sails past the "-1 dB brickwall". The float overshoot was then clipped by
 * the 16-bit PCM encode (wav-encoder.ts), so every WAV/stems bounce of the
 * preset shipped with clipping.
 *
 * This test renders the REAL stock preset (document -> canonical params ->
 * engine command API -> renderWav, the production path) at the export
 * arrangement the Bounce tab produces (the full 8-bar chain) and asserts
 * the float buffer never exceeds 0 dBFS before PCM encode. The master bus's
 * output ceiling (MASTER_OUTPUT_CEILING, master-bus.ts) is what guarantees
 * this.
 *
 * Pre-master stems are deliberately NOT asserted below 0 dBFS: they bypass
 * the master chain by design (unity master volume, channel processing
 * only), so a hot channel volume can legitimately push a stem's float peak
 * over full scale. They are rendered here only to keep the path covered
 * and to log their peaks alongside the mix.
 */

import { beforeAll, describe, expect, it } from "vitest";
import { server } from "vitest/browser";

import type { MasterChainCanonical } from "@/core/audio/bridge/engine-params";
import type { AudioEngine } from "@/core/audio/engine";
import { aDrumCalledHaus } from "@/core/dh";
import { loadKit } from "@/core/dhkit";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import type { PresetDocument } from "@/features/preset/document";
import { peakAmplitude } from "@/test/analysis";
import { createFixtureEngine } from "@/test/render";

/**
 * The stock preset's chain plays 3+1+3+1 bars, so 8 bars is one full pass -
 * the same arrangement the issue's original measurement used.
 */
const EXPORT_BARS = 8;
/** Fixed rate so the render is deterministic across machines. */
const SAMPLE_RATE = 48000;
/** Per-render timeout headroom: ~20s of offline audio + 8 sampler loads. */
const RENDER_TIMEOUT = 300_000;

function dbfs(peak: number): number {
  return 20 * Math.log10(peak);
}

/**
 * Peak lines reported by both tests, written to
 * audition-out/export-peak-report.txt (gitignored) so the measured levels
 * can be read even when the suite passes (passing browser tests don't
 * surface console output).
 */
const reportLines: string[] = [];

async function report(line: string): Promise<void> {
  reportLines.push(line);
  console.log(`[export-peak] ${line}`);
  await server.commands.writeFile(
    "audition-out/export-peak-report.txt",
    `${reportLines.join("\n")}\n`,
    "utf-8",
  );
}

/**
 * Document channel -> canonical instrument params. Mirrors
 * paramsFromChannel in features/preset/document/apply.ts, which is not
 * importable here (it is deliberately store-coupled and excluded from the
 * document barrel).
 */
function paramsFromChannel(
  channel: PresetDocument["channels"][number],
): InstrumentData["params"] {
  return {
    decay: channel.decaySeconds,
    filter: channel.filter,
    volume: channel.volumeDb ?? -Infinity,
    pan: channel.pan,
    tune: channel.tuneSemitones,
    solo: channel.solo,
    mute: channel.mute,
  };
}

/** Document master -> canonical master params (mirrors apply.ts). */
function masterFromDocument(
  master: PresetDocument["master"],
): MasterChainCanonical {
  return {
    filter: master.filter,
    saturation: master.saturation,
    phaser: master.phaser,
    reverb: master.reverb,
    compThreshold: master.compThresholdDb,
    compRatio: master.compRatio,
    compAttack: master.compAttackSeconds,
    compMix: master.compMix,
    masterVolume: master.masterVolumeDb ?? -Infinity,
  };
}

/** Fetches a real kit sample served from public/ into a blob URL. */
async function fetchSampleUrl(path: string): Promise<string> {
  const res = await fetch(`/samples/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch sample ${path}: ${res.status}`);
  }
  return URL.createObjectURL(await res.blob());
}

describe("export peak headroom (issue #346)", () => {
  let engine: AudioEngine;
  let doc: PresetDocument;

  beforeAll(async () => {
    doc = aDrumCalledHaus();
    const kit = loadKit(doc.kit.id);
    if (!kit) throw new Error(`Unknown kit ${doc.kit.id}`);

    const instruments: InstrumentData[] = kit.instruments.map(
      (instrument, index) => ({
        ...instrument,
        params: paramsFromChannel(doc.channels[index]),
      }),
    );
    const sampleUrls = await Promise.all(
      instruments.map((instrument) => fetchSampleUrl(instrument.sample.path)),
    );

    engine = await createFixtureEngine({
      pattern: doc.pattern,
      instruments,
      sampleUrls,
      bpm: doc.transport.bpm,
      swing: doc.transport.swing,
      chain: doc.playback.chain,
      chainEnabled: doc.playback.chainEnabled,
      masterParams: masterFromDocument(doc.master),
    });
  }, RENDER_TIMEOUT);

  it(
    "keeps the stock preset's full-mix float render at or below 0 dBFS",
    async () => {
      const buffer = await engine.renderWav({
        bars: EXPORT_BARS,
        sampleRate: SAMPLE_RATE,
        includeTail: false,
      });

      const peak = peakAmplitude(buffer);
      await report(
        `full mix: ${peak.toFixed(6)} (${dbfs(peak).toFixed(2)} dBFS)`,
      );

      // Sanity: the render actually carries the mix at production level.
      expect(peak).toBeGreaterThan(0.5);
      // The float buffer must not overshoot full scale, or the 16-bit PCM
      // encode clips it (epsilon covers float rounding only).
      expect(peak).toBeLessThanOrEqual(1 + 1e-4);
    },
    RENDER_TIMEOUT,
  );

  it(
    "renders pre-master stems and logs their peaks",
    async () => {
      for (let slot = 0; slot < doc.channels.length; slot++) {
        const buffer = await engine.renderWav({
          bars: EXPORT_BARS,
          sampleRate: SAMPLE_RATE,
          includeTail: false,
          soloChannelIndex: slot,
          masterTap: "preMaster",
        });
        const peak = peakAmplitude(buffer);
        await report(
          `stem ${slot + 1}: ${peak.toFixed(6)} (${dbfs(peak).toFixed(2)} dBFS)`,
        );
        // Stems carry signal (every stock-preset channel has triggers) and
        // stay within the encoder's representable range only if channel
        // volumes allow; assert presence, not headroom (see header note).
        expect(peak).toBeGreaterThan(0.01);
      }
    },
    RENDER_TIMEOUT,
  );
});
