/**
 * Parse-level tests for the v2 preset document schema: a hand-built valid
 * document parses, and each range/arity violation fails at the offending
 * path.
 */

import { describe, expect, it } from "vitest";

import type {
  StepSequence,
  TimingNudge,
  VariationId,
  Voice,
} from "@/core/audio/engine/pattern-types";
import { presetDocumentSchema, type PresetDocument } from "./document";

function makeStepSequence(): StepSequence {
  return {
    triggers: Array(16).fill(false),
    velocities: Array(16).fill(1),
    timingNudge: 0,
    ratchets: Array(16).fill(false),
    flams: Array(16).fill(false),
  };
}

function makeVoice(instrumentIndex: number): Voice {
  return {
    instrumentIndex,
    variations: [
      makeStepSequence(),
      makeStepSequence(),
      makeStepSequence(),
      makeStepSequence(),
    ],
  };
}

function makeChannel(): PresetDocument["channels"][number] {
  return {
    decaySeconds: 0.5,
    filter: 50,
    volumeDb: 0,
    pan: 0,
    tuneSemitones: 0,
    mute: false,
    solo: false,
  };
}

const validDocument: PresetDocument = {
  kind: "drumhaus.preset",
  version: 2,
  meta: {
    id: "preset-test",
    name: "Test Preset",
    createdAt: "2026-07-14T00:00:00.000Z",
    updatedAt: "2026-07-14T00:00:00.000Z",
  },
  kit: { id: "kit-0" },
  channels: [
    makeChannel(),
    makeChannel(),
    makeChannel(),
    makeChannel(),
    makeChannel(),
    makeChannel(),
    makeChannel(),
    makeChannel(),
  ],
  pattern: {
    voices: Array.from({ length: 8 }, (_, i) => makeVoice(i)),
    variationMetadata: [
      { accent: Array(16).fill(false) },
      { accent: Array(16).fill(false) },
      { accent: Array(16).fill(false) },
      { accent: Array(16).fill(false) },
    ],
  },
  playback: {
    chain: {
      steps: [
        { variation: 0, repeats: 2 },
        { variation: 1, repeats: 1 },
      ],
    },
    chainEnabled: true,
  },
  transport: { bpm: 120, swing: 0.25 },
  master: {
    filter: 50,
    saturation: 0.3,
    phaser: 0,
    reverb: 0.5,
    compThresholdDb: -12,
    compRatio: 4,
    compAttackSeconds: 0.01,
    compMix: 0.7,
    masterVolumeDb: 0,
  },
};

function mutated(mutate: (doc: PresetDocument) => void): PresetDocument {
  const doc = structuredClone(validDocument);
  mutate(doc);
  return doc;
}

function expectFailureAt(doc: unknown, path: (string | number)[]) {
  const result = presetDocumentSchema.safeParse(doc);
  expect(result.success).toBe(false);
  if (result.success) return;
  expect(result.error.issues.map((issue) => issue.path)).toContainEqual(path);
}

describe("presetDocumentSchema", () => {
  it("parses a hand-built valid document", () => {
    const result = presetDocumentSchema.safeParse(validDocument);
    expect(result.success).toBe(true);
  });

  it("parses null volumes (the JSON spelling of -Infinity)", () => {
    const doc = mutated((d) => {
      d.channels[3].volumeDb = null;
      d.master.masterVolumeDb = null;
    });
    expect(presetDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("parses an optional author", () => {
    const doc = mutated((d) => {
      d.meta.author = "Max";
    });
    expect(presetDocumentSchema.safeParse(doc).success).toBe(true);
  });

  it("rejects a wrong kind", () => {
    expectFailureAt(
      mutated((d) => {
        d.kind = "drumhaus.kit" as PresetDocument["kind"];
      }),
      ["kind"],
    );
  });

  it("rejects version 1", () => {
    expectFailureAt(
      mutated((d) => {
        d.version = 1 as PresetDocument["version"];
      }),
      ["version"],
    );
  });

  it("rejects swing above 0.5", () => {
    expectFailureAt(
      mutated((d) => {
        d.transport.swing = 0.6;
      }),
      ["transport", "swing"],
    );
  });

  it("rejects a non-positive bpm", () => {
    expectFailureAt(
      mutated((d) => {
        d.transport.bpm = 0;
      }),
      ["transport", "bpm"],
    );
  });

  it("rejects compRatio 9", () => {
    expectFailureAt(
      mutated((d) => {
        d.master.compRatio = 9;
      }),
      ["master", "compRatio"],
    );
  });

  it("rejects a fractional compRatio", () => {
    expectFailureAt(
      mutated((d) => {
        d.master.compRatio = 4.5;
      }),
      ["master", "compRatio"],
    );
  });

  it("rejects a volumeDb below the range", () => {
    expectFailureAt(
      mutated((d) => {
        d.channels[2].volumeDb = -50;
      }),
      ["channels", 2, "volumeDb"],
    );
  });

  it("rejects a tune outside +/-7 semitones", () => {
    expectFailureAt(
      mutated((d) => {
        d.channels[0].tuneSemitones = 8;
      }),
      ["channels", 0, "tuneSemitones"],
    );
  });

  it("rejects a 7-channel document", () => {
    expectFailureAt(
      mutated((d) => {
        (d.channels as unknown as unknown[]).pop();
      }),
      ["channels"],
    );
  });

  it("rejects 15-length triggers", () => {
    expectFailureAt(
      mutated((d) => {
        d.pattern.voices[0].variations[0].triggers = Array(15).fill(false);
      }),
      ["pattern", "voices", 0, "variations", 0, "triggers"],
    );
  });

  it("rejects a velocity above 1", () => {
    expectFailureAt(
      mutated((d) => {
        d.pattern.voices[1].variations[2].velocities[3] = 1.5;
      }),
      ["pattern", "voices", 1, "variations", 2, "velocities", 3],
    );
  });

  it("rejects a timingNudge outside -2..2", () => {
    expectFailureAt(
      mutated((d) => {
        d.pattern.voices[0].variations[0].timingNudge = 3 as TimingNudge;
      }),
      ["pattern", "voices", 0, "variations", 0, "timingNudge"],
    );
  });

  it("rejects a 7-voice pattern", () => {
    expectFailureAt(
      mutated((d) => {
        d.pattern.voices.pop();
      }),
      ["pattern", "voices"],
    );
  });

  it("rejects a chain longer than 8 steps", () => {
    expectFailureAt(
      mutated((d) => {
        d.playback.chain.steps = Array.from({ length: 9 }, () => ({
          variation: 0 as VariationId,
          repeats: 1,
        }));
      }),
      ["playback", "chain", "steps"],
    );
  });

  it("rejects a chain step with 0 repeats", () => {
    expectFailureAt(
      mutated((d) => {
        d.playback.chain.steps[0].repeats = 0;
      }),
      ["playback", "chain", "steps", 0, "repeats"],
    );
  });

  it("rejects a chain step with variation 4", () => {
    expectFailureAt(
      mutated((d) => {
        d.playback.chain.steps[0].variation = 4 as VariationId;
      }),
      ["playback", "chain", "steps", 0, "variation"],
    );
  });
});
