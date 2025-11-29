import { Pattern } from "./pattern";

export type VariationCycle = "A" | "B" | "AB" | "AAAB";

export interface SequencerData {
  pattern: Pattern;
  variationCycle: VariationCycle;
}
