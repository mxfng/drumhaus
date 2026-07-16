import { describe, expect, it } from "vitest";

import { init } from "./index";

describe("bundled default loaders", () => {
  it("returns an independent copy on every call", () => {
    const first = init();
    const voice = first.pattern.voices[0];
    voice.variations[0].triggers[0] = !voice.variations[0].triggers[0];
    first.channels[0].volumeDb = -1;

    const second = init();
    expect(second.pattern.voices[0].variations[0].triggers[0]).not.toBe(
      voice.variations[0].triggers[0],
    );
    expect(second.channels[0].volumeDb).not.toBe(-1);
  });
});
