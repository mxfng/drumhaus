import { InstrumentData } from "@/lib/instrument/types";

/**
 * Serializable kit definition
 * Contains an array of 8 instruments with all their parameters
 */
export interface Kit {
  name: string;
  instruments: InstrumentData[];
}

export type VariationCycle = "A" | "B" | "AB" | "AAAB";

// legacy
export type Sequences = [boolean[], number[]][][];
