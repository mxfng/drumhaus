# The knob primitive

Status: shipped and complete (epic #359; recomposed onto the headless primitive in PR #365).
Author: Max, July 2026.
Related: [data-representation.md](./data-representation.md) defines the canonical-units rule this control binds to (its P4 confines control position to this widget).

## Why

Drumhaus needs one reusable parameter control, not a bespoke widget per knob.
It should be a premium, flexible foundation for a family of instruments: any future parameter is described once and the same control renders and edits it.
The design goal is parity with the mature plugin frameworks (JUCE, VST3) and the best web controls, written natively for React and TypeScript.

The control is descriptor-driven.
A `ParamDescriptor` fully specifies a parameter's range, curve, stepping, polarity, default, and formatting, and one knob, slider, or value field consumes any descriptor.

## The value model

Three representations, cleanly separated, matching the industry norm.

- **Canonical (plain) value.**
  The control's entire public API speaks canonical units: Hz, dB, seconds, semitones, `{ side, cutoffHz }`.
  It reads a canonical value and emits a canonical value; it never exposes a normalized or 0-100 number.
  This is the value the app stores and the engine hears (see [data-representation.md](./data-representation.md)).

- **Normalized [0, 1] position.**
  The control's private transport, matching VST3 `getNormalized`/`setNormalized` and JUCE `convertTo0to1`.
  All drag and keyboard arithmetic happens here, so a single sensitivity constant is correct for a 20 Hz to 20 kHz knob and a 0-1 mix knob alike.
  Mapped to and from canonical by the descriptor's taper.

- **Display string.**
  A pure projection of the canonical value ("2.5 kHz", "-6.0 dB", "LP"), computed at render, never stored.

0-100 appears nowhere; it was an arbitrary normalization and is replaced by [0, 1] internal plus canonical external.

## ParamDescriptor

```ts
interface ParamDescriptor<T = number> {
  min: T;
  max: T;

  // normalized [0,1] <-> canonical
  taper:
    | { kind: "linear" }
    | { kind: "exponential"; skew: number; symmetric?: boolean }
    | { kind: "custom"; to01: Fn; from01: Fn };

  default: T; // reset target; center value for bipolar

  interval?: number; // snap step in canonical units (0 = continuous)
  stepCount?: number; // discrete/enum params (VST3 model)
  valueLabels?: string[] | ((v: T) => string); // names for discrete steps

  polarity?: "unipolar" | "bipolar"; // center-origin fill + center detent
  detents?: { value: T; radiusPct: number }[]; // magnetic notches

  format: (canonical: T) => string; // "2.5 kHz"
  parse?: (text: string) => T | null; // type-in entry
  unit?: string;
  precision?: number;

  dragSensitivity?: number; // px delta -> normalized delta
  fineDragFactor?: number; // multiplier while fine modifier held
  keyStep?: number; // arrow increment
  keyStepLarge?: number; // Page increment
}
```

### The taper

Scalar `skew` is the default representation because it is serializable, comparable, and interpolatable, and because JUCE's `setSkewForCentre(value)` lets an author declare "1 kHz sits at knob-center" and derives the exponent, instead of scattering magic exponents through the code.
`symmetric` applies the skew from the middle outward, keeping knob-center pinned to the parameter's center for bipolar params (pan, detune, pitch).
The `custom` `{ to01, from01 }` pair is the escape hatch for curves that are not a single exponent, such as the split filter's position to `{ side, cutoffHz }`.

The existing linear, exponential, tune, and split-filter mappings become descriptors.

## Interaction model

### Must-have (the foundation)

- Absolute vertical drag; delta computed in normalized space so one `dragSensitivity` works across every range and taper.
- Shift for fine drag.
  Shift has exactly one meaning (fine); coarse and stepped moves route to the wheel and Page keys.
  This is the Ableton/Serum convention, chosen over Vital's Shift-as-coarse.
- Double-click or Delete resets to `default`.
- Type-in value entry via `parse`, with Enter to confirm and Esc to cancel.
- Keyboard and ARIA: `role="slider"`, `aria-valuemin`/`max`/`now`; arrows step by `keyStep`, Page by `keyStepLarge`, Home/End to the endpoints.
  `aria-valuetext` is the display string ("2.5 kHz"), never the raw number.
- Gesture bracketing: `onGestureStart` and `onGestureEnd`, distinct from `onChange`, present from day one.
  Undo coalescing, future automation write, and preset-dirty tracking depend on these boundaries, and retrofitting them is painful.
- Range clamping on every path.
- A gesture holds a raw, unrounded value and rounds only at display and commit, so stepped params do not accumulate drift and fine drag can move sub-step amounts.

### Nice-to-have

- Mouse-wheel stepping (honoring `interval`, no smooth-wheel).
- Bipolar center-origin fill for pan, detune, and pitch.
- Detent snapping with a small magnetic radius, auto-disabled under fine drag so a center notch never fights a precise off-center dial-in.
- A transient value bubble on hover and drag.
- Touch and mouse through one pointer-event gesture path.
- Opt-in tab order (a dense instrument panel should not flood the tab sequence).

### Future (leave seams, do not build now)

- A modulation-range arc, rendered decoupled from the value indicator, so it can layer in without reworking the primitive.
- An optional circular / relative drag mode as a user preference.
- A right-click context menu (assign, copy/paste, clear).

## Sources

JUCE `NormalisableRange` and `AudioParameterFloat`; VST3 `Vst::Parameter`; Vital `synth_slider` (open source, the Serum-lineage UX); react-knob-headless and `@dsp-ts/math`; the WAI-ARIA APG slider pattern; the Ableton Live manual.
