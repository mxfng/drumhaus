export type {
  Taper,
  Detent,
  ParamDescriptor,
  RotaryKnobFutureSeams,
} from "./types";
export {
  clamp01,
  setSkewForCentre,
  taperToNormalized,
  taperFromNormalized,
} from "./lib/taper";
export {
  canonicalToNormalized,
  normalizedToCanonical,
  formatValue,
  parseValue,
  resetValue,
  stepValue,
  endpointValue,
  isDiscrete,
  clampValue,
  DEFAULT_DRAG_SENSITIVITY,
  DEFAULT_FINE_DRAG_FACTOR,
  DEFAULT_KEY_STEP,
  DEFAULT_KEY_STEP_LARGE,
} from "./lib/descriptor";
export { useParamControl } from "./hooks/use-param-control";
export type {
  UseParamControlProps,
  UseParamControlResult,
} from "./hooks/use-param-control";
export { RotaryKnob } from "./components/rotary-knob";
export type { RotaryKnobProps } from "./components/rotary-knob";
export * from "./descriptors/canonical-scalars";
export {
  FILTER_MIN_HZ,
  FILTER_MAX_HZ,
  positionToFilter,
  filterToPosition,
  splitFilterDescriptor,
} from "./descriptors/filter";
