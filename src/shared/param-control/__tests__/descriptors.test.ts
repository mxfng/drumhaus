import { describe, expect, it } from "vitest";

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import {
  instrumentDecayDescriptor,
  instrumentPanDescriptor,
  instrumentTuneDescriptor,
  instrumentVolumeDescriptor,
  masterCompRatioDescriptor,
  masterVolumeDescriptor,
  transportSwingDescriptor,
} from "../descriptors/canonical-scalars";
import {
  filterToPosition,
  positionToFilter,
  splitFilterDescriptor,
} from "../descriptors/filter";
import {
  canonicalToNormalized,
  normalizedToCanonical,
} from "../lib/descriptor";

describe("volume descriptor", () => {
  it("shows -infinity only for true silence, not the -46 dB floor", () => {
    expect(instrumentVolumeDescriptor.format(-Infinity)).toBe("-∞ dB");
    expect(instrumentVolumeDescriptor.format(-46)).toBe("-46.0 dB");
    expect(instrumentVolumeDescriptor.format(0)).toBe("0.0 dB");
    expect(instrumentVolumeDescriptor.format(4)).toBe("+4.0 dB");
  });

  it("parses dB, including the silence sentinel as -Infinity", () => {
    expect(instrumentVolumeDescriptor.parse?.("-6.0 dB")).toBeCloseTo(-6, 9);
    expect(instrumentVolumeDescriptor.parse?.("-∞ dB")).toBe(-Infinity);
    expect(masterVolumeDescriptor.parse?.("-inf")).toBe(-Infinity);
  });

  it("maps position 0 to true silence (-Infinity)", () => {
    expect(normalizedToCanonical(instrumentVolumeDescriptor, 0)).toBe(
      -Infinity,
    );
    expect(normalizedToCanonical(masterVolumeDescriptor, 0)).toBe(-Infinity);
    expect(canonicalToNormalized(instrumentVolumeDescriptor, -Infinity)).toBe(
      0,
    );
  });

  it("maps positions above 0 across the finite [-46, 4] dB range", () => {
    // Position 1 is the ceiling; the midpoint is the linear middle of the span.
    expect(normalizedToCanonical(instrumentVolumeDescriptor, 1)).toBeCloseTo(
      4,
      9,
    );
    expect(normalizedToCanonical(instrumentVolumeDescriptor, 0.5)).toBeCloseTo(
      -21,
      9,
    );
  });

  it("round-trips format -> parse for finite values", () => {
    for (const v of [-30, -12, -6, 0, 4]) {
      const text = instrumentVolumeDescriptor.format(v);
      expect(instrumentVolumeDescriptor.parse?.(text)).toBeCloseTo(v, 1);
    }
  });
});

describe("pan descriptor", () => {
  it("formats L / C / R", () => {
    expect(instrumentPanDescriptor.format(0)).toBe("C");
    expect(instrumentPanDescriptor.format(-0.5)).toBe("L50");
    expect(instrumentPanDescriptor.format(0.5)).toBe("R50");
  });

  it("parses L / C / R and bare numbers", () => {
    expect(instrumentPanDescriptor.parse?.("C")).toBe(0);
    expect(instrumentPanDescriptor.parse?.("L50")).toBeCloseTo(-0.5, 9);
    expect(instrumentPanDescriptor.parse?.("R25")).toBeCloseTo(0.25, 9);
    expect(instrumentPanDescriptor.parse?.("0.3")).toBeCloseTo(0.3, 9);
  });

  it("keeps centre at knob-centre (bipolar linear)", () => {
    expect(canonicalToNormalized(instrumentPanDescriptor, 0)).toBeCloseTo(
      0.5,
      9,
    );
  });
});

describe("tune descriptor (canonical semitones)", () => {
  it("formats a signed semitone offset", () => {
    expect(instrumentTuneDescriptor.format(0)).toBe("0.0 st");
    expect(instrumentTuneDescriptor.format(3.5)).toBe("+3.5 st");
    expect(instrumentTuneDescriptor.format(-2)).toBe("-2.0 st");
  });

  it("is bipolar and centred", () => {
    expect(canonicalToNormalized(instrumentTuneDescriptor, 0)).toBeCloseTo(
      0.5,
      9,
    );
  });
});

describe("decay descriptor", () => {
  it("formats ms and s", () => {
    expect(instrumentDecayDescriptor.format(0.25)).toBe("250 ms");
    expect(instrumentDecayDescriptor.format(2.5)).toBe("2.50 s");
  });

  it("parses ms and s", () => {
    expect(instrumentDecayDescriptor.parse?.("250 ms")).toBeCloseTo(0.25, 9);
    expect(instrumentDecayDescriptor.parse?.("2.5 s")).toBeCloseTo(2.5, 9);
  });
});

describe("compressor ratio descriptor", () => {
  it("quantizes to integer ratios", () => {
    expect(normalizedToCanonical(masterCompRatioDescriptor, 0)).toBe(1);
    expect(normalizedToCanonical(masterCompRatioDescriptor, 1)).toBe(8);
    expect(masterCompRatioDescriptor.format(4)).toBe("4:1");
  });
});

describe("swing descriptor", () => {
  it("displays MPC percent from the Tone swing fraction", () => {
    expect(transportSwingDescriptor.format(0)).toBe("50%");
    expect(transportSwingDescriptor.format(0.375)).toBe("62.5%");
  });

  it("round-trips MPC display back to the swing fraction", () => {
    expect(transportSwingDescriptor.parse?.("62.5%")).toBeCloseTo(0.375, 9);
    expect(transportSwingDescriptor.parse?.("50%")).toBeCloseTo(0, 9);
  });
});

describe("split-filter descriptor (generic-T custom taper)", () => {
  it("round-trips { side, cutoffHz } through the custom taper", () => {
    const samples: CanonicalFilter[] = [
      { side: "lowpass", cutoffHz: 15000 },
      { side: "lowpass", cutoffHz: 2000 },
      { side: "lowpass", cutoffHz: 200 },
      // NB: cutoff == min is the shared open extreme (== centre == fully open),
      // which resolves to the low-pass-open side, so keep HP samples above min.
      { side: "highpass", cutoffHz: 100 },
      { side: "highpass", cutoffHz: 800 },
      { side: "highpass", cutoffHz: 12000 },
    ];
    for (const filter of samples) {
      const pos = filterToPosition(filter);
      const back = positionToFilter(pos);
      expect(back.side).toBe(filter.side);
      expect(back.cutoffHz).toBeCloseTo(filter.cutoffHz, 3);
    }
  });

  it("clamps an out-of-range cutoffHz into a valid display position", () => {
    // A migrated old/factory preset can carry a cutoffHz outside the
    // descriptor's [20, 15000] audible range: the frozen curve reaches 0 Hz at
    // the old centre and ~15618 Hz at its closed high-pass extreme. The live
    // descriptor may DISPLAY such a preset at a shifted knob position (that is
    // the accepted two-curve trade-off), but filterToPosition must stay finite
    // and inside [0, 1] rather than produce NaN or overflow. The engine still
    // consumes the exact stored cutoffHz (engine/fx/split-filter.ts).
    const outOfRange: CanonicalFilter[] = [
      { side: "lowpass", cutoffHz: 0 },
      { side: "highpass", cutoffHz: 0 },
      { side: "lowpass", cutoffHz: 15618.49 },
      { side: "highpass", cutoffHz: 15618.49 },
    ];
    for (const filter of outOfRange) {
      const pos = filterToPosition(filter);
      expect(Number.isFinite(pos)).toBe(true);
      expect(pos).toBeGreaterThanOrEqual(0);
      expect(pos).toBeLessThanOrEqual(1);
    }
  });

  it("places the open extreme (fully open LP) at knob-centre", () => {
    const centre = positionToFilter(0.5);
    expect(centre.side).toBe("lowpass");
    expect(centre.cutoffHz).toBeCloseTo(15000, 6);
  });

  it("selects the low-pass side left of centre and high-pass right", () => {
    expect(positionToFilter(0.25).side).toBe("lowpass");
    expect(positionToFilter(0.75).side).toBe("highpass");
  });

  it("round-trips through the descriptor's canonical <-> position ops", () => {
    const filter: CanonicalFilter = { side: "highpass", cutoffHz: 500 };
    const pos = canonicalToNormalized(splitFilterDescriptor, filter);
    const back = normalizedToCanonical(splitFilterDescriptor, pos);
    expect(back.side).toBe("highpass");
    expect(back.cutoffHz).toBeCloseTo(500, 3);
  });

  it("formats with the side prefix", () => {
    expect(
      splitFilterDescriptor.format({ side: "lowpass", cutoffHz: 2500 }),
    ).toBe("LP 2.5 kHz");
    expect(
      splitFilterDescriptor.format({ side: "highpass", cutoffHz: 800 }),
    ).toBe("HP 800 Hz");
  });
});
