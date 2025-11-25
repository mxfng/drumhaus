export type FormattedValue = { value: string; append?: string };

/**
 * Where TValue is the domain value (1000 Hz) and step is the knob step (0..100).
 * This is used to map the knob step to the domain value and vice versa.
 * The format function is used to display the value in the UI.
 */
export type ParamMapping<TValue = number> = {
  /** 0..stepCount discrete steps */
  stepCount: number;
  /** canonical step -> domain */
  stepToValue: (step: number) => TValue;
  /** domain -> step (for restore/init) */
  valueToStep: (value: TValue) => number;
  /** display-only */
  format: (value: TValue, step: number) => FormattedValue;
  /** default value */
  defaultStep: number;
};
