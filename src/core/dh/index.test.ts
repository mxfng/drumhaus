import { describe, expect, it } from "vitest";

import { init } from "./index";

describe("bundled default loaders", () => {
  it("returns an independent copy on every call", () => {
    const first = init();
    const voice = first.sequencer.pattern.voices[0];
    voice.variations[0].triggers[0] = !voice.variations[0].triggers[0];
    first.kit.instruments[0].params.volume = -1;

    const second = init();
    expect(
      second.sequencer.pattern.voices[0].variations[0].triggers[0],
    ).not.toBe(voice.variations[0].triggers[0]);
    expect(second.kit.instruments[0].params.volume).not.toBe(-1);
  });
});
