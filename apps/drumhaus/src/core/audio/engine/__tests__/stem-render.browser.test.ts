/**
 * Regression tests for renderWav's stem options (issue #308):
 * soloChannelIndex (single-channel isolation) and masterTap
 * ("master" through the full master chain vs "preMaster" straight to the
 * offline destination).
 *
 * These follow the golden-render patterns: fixture state is pushed through
 * the real engine command API (createFixtureEngine) and rendered via the
 * production renderWav path; assertions use onset deltas or compare two
 * renders against each other. See golden-render.browser.test.ts for the
 * note on master-chain latency (~12ms constant onset offset) - the
 * pre-master tap has none, which one test below locks in.
 */

import { getContext } from "tone/build/esm/index";
import { beforeAll, describe, expect, it } from "vitest";

import type { RenderWavOptions } from "@/core/audio/engine/audio-engine";
import { findOnsets, peakInWindow, rmsInWindow } from "@/test/analysis";
import {
  makeClickSampleUrl,
  makeInstrument,
  makePattern,
} from "@/test/fixtures";
import { createFixtureEngine, type RenderFixtureOptions } from "@/test/render";

const BPM = 120;
/** Duration of one 16th note at 120 BPM. */
const STEP = 60 / BPM / 4; // 0.125s
/** Tolerance for onset-delta assertions. */
const TOL = 0.005;

let clickUrl: string;

beforeAll(() => {
  clickUrl = makeClickSampleUrl();
});

/**
 * Renders fixture state through the production path with explicit
 * renderWav option overrides (renderFixture itself stays options-free).
 */
async function renderWithOptions(
  fixtureOpts: RenderFixtureOptions,
  renderOpts: Partial<RenderWavOptions> = {},
): Promise<AudioBuffer> {
  const engine = await createFixtureEngine(fixtureOpts);
  try {
    return await engine.renderWav({
      bars: fixtureOpts.bars ?? 1,
      sampleRate: getContext().sampleRate,
      includeTail: false,
      ...renderOpts,
    });
  } finally {
    engine.dispose();
  }
}

describe("stem render: soloChannelIndex", () => {
  // Kick on steps 0/8, snare on steps 4/12: each channel's onsets are
  // distinguishable by position, so isolation shows up as both a count
  // and a timing signature.
  const fixture = (): RenderFixtureOptions => ({
    pattern: makePattern({
      steps: [
        { voice: 0, step: 0 },
        { voice: 0, step: 8 },
        { voice: 1, step: 4 },
        { voice: 1, step: 12 },
      ],
    }),
    instruments: [makeInstrument(0, "kick"), makeInstrument(1, "snare")],
    sampleUrls: [clickUrl, clickUrl],
    bpm: BPM,
  });

  it("renders only the isolated channel's onsets", async () => {
    const fullBuffer = await renderWithOptions(fixture());
    expect(findOnsets(fullBuffer)).toHaveLength(4);

    const kickStem = await renderWithOptions(fixture(), {
      soloChannelIndex: 0,
    });
    const kickOnsets = findOnsets(kickStem);
    expect(kickOnsets).toHaveLength(2);
    // Steps 0 and 8 are 8 steps apart.
    expect(kickOnsets[1] - kickOnsets[0]).toBeGreaterThan(8 * STEP - TOL);
    expect(kickOnsets[1] - kickOnsets[0]).toBeLessThan(8 * STEP + TOL);
    // The first kick sits on the bar line (plus master-chain latency only).
    expect(kickOnsets[0]).toBeLessThan(0.02);

    const snareStem = await renderWithOptions(fixture(), {
      soloChannelIndex: 1,
    });
    const snareOnsets = findOnsets(snareStem);
    expect(snareOnsets).toHaveLength(2);
    // The first snare sits on step 4, not step 0.
    expect(snareOnsets[0]).toBeGreaterThan(4 * STEP - TOL);
    expect(snareOnsets[0]).toBeLessThan(4 * STEP + 0.02);
  });

  it("overrides a retained solo on another channel without mutating it", async () => {
    // The snare is soloed in the pushed state; isolating the kick must win
    // for this render only.
    const opts: RenderFixtureOptions = {
      pattern: makePattern({
        steps: [
          { voice: 0, step: 0 },
          { voice: 1, step: 8 },
        ],
      }),
      instruments: [
        makeInstrument(0, "kick"),
        makeInstrument(1, "snare", { solo: true }),
      ],
      sampleUrls: [clickUrl, clickUrl],
      bpm: BPM,
    };

    const engine = await createFixtureEngine(opts);
    try {
      const renderOpts = {
        bars: 1,
        sampleRate: getContext().sampleRate,
        includeTail: false,
      };

      const kickStem = await engine.renderWav({
        ...renderOpts,
        soloChannelIndex: 0,
      });
      const kickOnsets = findOnsets(kickStem);
      expect(kickOnsets).toHaveLength(1);
      expect(kickOnsets[0]).toBeLessThan(0.1); // step 0, not step 8

      // The retained snare solo is untouched: a plain render on the SAME
      // engine still honors it.
      const plainBuffer = await engine.renderWav(renderOpts);
      const plainOnsets = findOnsets(plainBuffer);
      expect(plainOnsets).toHaveLength(1);
      expect(plainOnsets[0]).toBeGreaterThan(8 * STEP - TOL); // step 8
    } finally {
      engine.dispose();
    }
  });

  it("renders a muted channel's stem silent, matching the mix", async () => {
    const buffer = await renderWithOptions(
      {
        pattern: makePattern({
          steps: [
            { voice: 0, step: 0 },
            { voice: 1, step: 8 },
          ],
        }),
        instruments: [
          makeInstrument(0, "kick"),
          makeInstrument(1, "snare", { mute: true }),
        ],
        sampleUrls: [clickUrl, clickUrl],
        bpm: BPM,
      },
      { soloChannelIndex: 1 },
    );

    expect(findOnsets(buffer)).toHaveLength(0);
  });
});

describe("stem render: masterTap", () => {
  const fourOnFloor = (): RenderFixtureOptions => ({
    pattern: makePattern({
      steps: [0, 4, 8, 12].map((step) => ({ voice: 0, step })),
    }),
    instruments: [makeInstrument(0, "kick")],
    sampleUrls: [clickUrl],
    bpm: BPM,
  });

  it("keeps the grid in both modes; preMaster carries no master-chain latency", async () => {
    const masterBuffer = await renderWithOptions(fourOnFloor(), {
      masterTap: "master",
    });
    const preBuffer = await renderWithOptions(fourOnFloor(), {
      masterTap: "preMaster",
    });

    const masterOnsets = findOnsets(masterBuffer);
    const preOnsets = findOnsets(preBuffer);
    expect(masterOnsets).toHaveLength(4);
    expect(preOnsets).toHaveLength(4);

    for (const onsets of [masterOnsets, preOnsets]) {
      for (let i = 1; i < onsets.length; i++) {
        const delta = onsets[i] - onsets[i - 1];
        expect(delta).toBeGreaterThan(4 * STEP - TOL);
        expect(delta).toBeLessThan(4 * STEP + TOL);
      }
    }

    // The master chain delays everything by ~12ms (comp dry delay +
    // limiter lookahead); the pre-master tap starts exactly on the bar
    // line.
    expect(preOnsets[0]).toBeLessThan(0.005);
    expect(masterOnsets[0]).toBeGreaterThan(preOnsets[0]);
  });

  it("drops the master-level reverb send in preMaster mode", async () => {
    // A single 10ms click at step 0 with the master reverb send up: only
    // the master tap should carry tail energy long after the click.
    const fixture = (): RenderFixtureOptions => ({
      pattern: makePattern({ steps: [{ voice: 0, step: 0 }] }),
      instruments: [makeInstrument(0, "snare")],
      sampleUrls: [clickUrl],
      bpm: BPM,
      masterParams: { reverb: 1 },
    });

    const masterBuffer = await renderWithOptions(fixture(), {
      masterTap: "master",
    });
    const preBuffer = await renderWithOptions(fixture(), {
      masterTap: "preMaster",
    });

    // Both taps carry the dry hit itself.
    expect(peakInWindow(masterBuffer, 0, 0.05)).toBeGreaterThan(0.1);
    expect(peakInWindow(preBuffer, 0, 0.05)).toBeGreaterThan(0.1);

    // Tail window well past the click (which is fully decayed by ~30ms).
    // The comparison is primarily RELATIVE: the tail's absolute level is
    // modest (the reverb send is pre-filtered and the click is short), but
    // pre-master must carry an order of magnitude less of it.
    const masterTail = rmsInWindow(masterBuffer, 0.1, 0.8);
    const preTail = rmsInWindow(preBuffer, 0.1, 0.8);
    expect(masterTail).toBeGreaterThan(0.0005); // reverb tail is present
    expect(preTail).toBeLessThan(masterTail * 0.1); // and absent pre-master
  });
});
