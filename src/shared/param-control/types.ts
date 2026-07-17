/**
 * The descriptor-driven parameter-control model.
 *
 * Full design: docs/knob-primitive.md. In short: a `ParamDescriptor<T>` fully
 * specifies a parameter's range, curve, stepping, polarity, default, and
 * formatting, and one control renders and edits any descriptor.
 *
 * Three representations are cleanly separated (docs/data-representation.md):
 *   - canonical (plain) value `T` - the entire public API speaks this,
 *   - normalized [0, 1] position - the control's private transport,
 *   - display string - a pure projection of canonical, computed at render.
 *
 * 0-100 appears nowhere.
 */

/**
 * Maps the normalized [0, 1] position to and from a canonical value.
 *
 *  - `linear`: proportion is the position.
 *  - `exponential`: a single JUCE-style `skew` scalar (serializable,
 *    comparable, interpolatable). `symmetric` applies the skew from the centre
 *    outward, pinning knob-centre to the parameter's centre for bipolar params.
 *    Derive `skew` with `setSkewForCentre` instead of writing magic exponents.
 *  - `custom`: the escape hatch for curves that are not a single exponent, such
 *    as the split filter's position to `{ side, cutoffHz }`.
 */
type Taper<T = number> =
  | { kind: "linear" }
  | { kind: "exponential"; skew: number; symmetric?: boolean }
  | {
      kind: "custom";
      to01: (value: T) => number;
      from01: (position: number) => T;
    };

/** A magnetic notch: `value` in canonical units, `radiusPct` in position [0,1]. */
interface Detent<T = number> {
  value: T;
  radiusPct: number;
}

interface ParamDescriptor<T = number> {
  min: T;
  max: T;

  /** normalized [0,1] <-> canonical */
  taper: Taper<T>;

  /** reset target; centre value for bipolar params */
  default: T;

  /** snap step in canonical units (0 or undefined = continuous); numeric params only */
  interval?: number;
  /** discrete/enum params: number of positions (VST3 model) */
  stepCount?: number;
  /** names for discrete steps */
  valueLabels?: string[] | ((v: T) => string);

  /** center-origin fill + centre detent affordance */
  polarity?: "unipolar" | "bipolar";
  /** magnetic notches, auto-disabled under fine drag */
  detents?: Detent<T>[];

  /** canonical -> display string, e.g. "2.5 kHz" */
  format: (canonical: T) => string;
  /** display string -> canonical, for type-in entry; return null to reject */
  parse?: (text: string) => T | null;
  unit?: string;
  precision?: number;

  /** normalized delta per pixel of vertical drag (one value across all ranges) */
  dragSensitivity?: number;
  /** multiplier applied to the drag delta while the fine modifier is held */
  fineDragFactor?: number;
  /** arrow-key increment (normalized units for continuous params) */
  keyStep?: number;
  /** Page-key increment (normalized units for continuous params) */
  keyStepLarge?: number;
}

/**
 * FUTURE render seams (docs/knob-primitive.md "Future").
 *
 * These are declared so the presentation can grow into them without reworking
 * the primitive. They are intentionally NOT implemented yet.
 */
interface ParamControlFutureSeams {
  /**
   * FUTURE: a modulation-range arc, rendered decoupled from the value
   * indicator so it can layer in later. Not rendered.
   */
  modulationRange?: { min: number; max: number };
  /**
   * FUTURE: an optional circular / relative drag mode as a user preference.
   * Only "vertical" is implemented.
   */
  dragMode?: "vertical" | "circular";
  /**
   * FUTURE: a right-click context menu (assign, copy/paste, clear). Not built.
   */
  onContextMenuRequest?: () => void;
}

export type { Taper, Detent, ParamDescriptor, ParamControlFutureSeams };
