import { describe, expect, it } from "vitest";

import {
  createEmptyPattern,
  type Pattern,
  type PatternChain,
  type VariationId,
} from "../engine/pattern-types";
import {
  buildStemReadme,
  FULL_MIX_FILENAME,
  planStemLanes,
  stemFileName,
  variationsPlayed,
  type StemVoiceDescriptor,
} from "./stem-exporter";

const DEFAULT_NAMES = [
  "Kick",
  "Kick2",
  "Snare",
  "Clap",
  "Hat",
  "OHat",
  "Tom",
  "Tom2",
];

function makeVoices(
  overrides: Partial<StemVoiceDescriptor>[] = [],
): StemVoiceDescriptor[] {
  return DEFAULT_NAMES.map((name, slot) => ({
    name,
    mute: false,
    solo: false,
    ...overrides[slot],
  }));
}

/** An empty pattern with triggers set on the given voice/variation steps. */
function makePattern(
  edits: { voice: number; step: number; variation?: VariationId }[],
): Pattern {
  const pattern = createEmptyPattern();
  for (const edit of edits) {
    pattern.voices[edit.voice].variations[edit.variation ?? 0].triggers[
      edit.step
    ] = true;
  }
  return pattern;
}

const NO_CHAIN: PatternChain = { steps: [{ variation: 0, repeats: 1 }] };

function makePlanOptions(
  pattern: Pattern,
  overrides: Partial<Parameters<typeof planStemLanes>[0]> = {},
) {
  return {
    pattern,
    chain: NO_CHAIN,
    chainEnabled: false,
    variation: 0 as VariationId,
    bars: 2,
    voices: makeVoices(),
    ...overrides,
  };
}

describe("stemFileName", () => {
  it("numbers stems by slot order and slugs the name", () => {
    expect(stemFileName(0, "Kick")).toBe("01-kick.wav");
    expect(stemFileName(4, "Hat")).toBe("05-hat.wav");
    expect(stemFileName(7, "Tom2")).toBe("08-tom2.wav");
  });

  it("collapses non-alphanumeric runs and trims edge dashes", () => {
    expect(stemFileName(2, "Stick Click!")).toBe("03-stick-click.wav");
    expect(stemFileName(5, "  808 / Sub  ")).toBe("06-808-sub.wav");
  });

  it("falls back to the channel number when the name has no usable characters", () => {
    expect(stemFileName(3, "***")).toBe("04-channel-4.wav");
    expect(stemFileName(3, "")).toBe("04-channel-4.wav");
  });
});

describe("variationsPlayed", () => {
  it("returns only the pushed variation when the chain is disabled", () => {
    const chain: PatternChain = {
      steps: [
        { variation: 0, repeats: 1 },
        { variation: 3, repeats: 1 },
      ],
    };
    expect(variationsPlayed(chain, false, 2, 4)).toEqual(new Set([2]));
  });

  it("walks the chain bar by bar when enabled", () => {
    const chain: PatternChain = {
      steps: [
        { variation: 0, repeats: 2 },
        { variation: 1, repeats: 1 },
      ],
    };
    // 3 bars = exactly one chain pass: A, A, B.
    expect(variationsPlayed(chain, true, 0, 3)).toEqual(new Set([0, 1]));
    // 2 bars never reach B.
    expect(variationsPlayed(chain, true, 0, 2)).toEqual(new Set([0]));
  });

  it("wraps the chain when bars exceed one pass", () => {
    const chain: PatternChain = {
      steps: [
        { variation: 0, repeats: 1 },
        { variation: 2, repeats: 1 },
      ],
    };
    expect(variationsPlayed(chain, true, 0, 5)).toEqual(new Set([0, 2]));
  });
});

describe("planStemLanes", () => {
  it("skips lanes with no triggers in the exported bars and keeps the rest", () => {
    const pattern = makePattern([
      { voice: 0, step: 0 },
      { voice: 2, step: 4 },
    ]);
    const lanes = planStemLanes(makePlanOptions(pattern));

    expect(lanes).toHaveLength(8);
    expect(lanes[0]).toEqual({
      slot: 0,
      name: "Kick",
      fileName: "01-kick.wav",
      skipReason: null,
    });
    expect(lanes[2].skipReason).toBeNull();
    for (const slot of [1, 3, 4, 5, 6, 7]) {
      expect(lanes[slot].skipReason).toBe("empty");
    }
  });

  it("treats triggers outside the played variations as empty", () => {
    // Triggers only in variation B, but the export plays variation A.
    const pattern = makePattern([{ voice: 0, step: 0, variation: 1 }]);
    const lanes = planStemLanes(makePlanOptions(pattern));
    expect(lanes[0].skipReason).toBe("empty");

    // A chain that reaches variation B keeps the lane.
    const chained = planStemLanes(
      makePlanOptions(pattern, {
        chain: {
          steps: [
            { variation: 0, repeats: 1 },
            { variation: 1, repeats: 1 },
          ],
        },
        chainEnabled: true,
      }),
    );
    expect(chained[0].skipReason).toBeNull();
  });

  it("skips muted lanes and lanes silenced by another channel's solo", () => {
    const pattern = makePattern([
      { voice: 0, step: 0 },
      { voice: 1, step: 2 },
      { voice: 2, step: 4 },
    ]);
    const lanes = planStemLanes(
      makePlanOptions(pattern, {
        voices: makeVoices([{ mute: true }, { solo: true }]),
      }),
    );

    expect(lanes[0].skipReason).toBe("muted");
    expect(lanes[1].skipReason).toBeNull(); // the soloed lane renders
    expect(lanes[2].skipReason).toBe("not-soloed");
    // Empty takes precedence: silent lanes are "empty" regardless of solo.
    expect(lanes[3].skipReason).toBe("empty");
  });
});

describe("buildStemReadme", () => {
  const meta = {
    presetName: "Test Preset",
    bpm: 95,
    bars: 4,
    sampleRate: 48000,
  };

  it("lists preset facts, the pre-master note, and rendered stems", () => {
    const lanes = planStemLanes(
      makePlanOptions(makePattern([{ voice: 0, step: 0 }])),
    );
    const readme = buildStemReadme(meta, lanes);

    expect(readme).toContain("Test Preset - stems");
    expect(readme).toContain("Tempo: 95 BPM");
    expect(readme).toContain("Length: 4 bars");
    expect(readme).toContain("Sample rate: 48000 Hz");
    expect(readme).toContain(FULL_MIX_FILENAME);
    expect(readme).toContain("PRE-MASTER");
    expect(readme).toContain("  01-kick.wav");
  });

  it("lists every skipped lane with its reason", () => {
    const lanes = planStemLanes(
      makePlanOptions(
        makePattern([
          { voice: 0, step: 0 },
          { voice: 4, step: 2 },
        ]),
        { voices: makeVoices([{}, {}, {}, {}, { mute: true }]) },
      ),
    );
    const readme = buildStemReadme(meta, lanes);

    expect(readme).toContain("Skipped (would have rendered silence):");
    expect(readme).toContain("05-hat.wav (muted)");
    expect(readme).toContain("02-kick2.wav (no triggers in the exported bars)");
    // Rendered stems never appear in the skipped section.
    expect(readme.split("Skipped")[1]).not.toContain("01-kick.wav");
  });
});
