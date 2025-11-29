import { createContext, type RefObject } from "react";

import type { InstrumentRuntime } from "@/features/instruments/types/instrument";
import type { PresetFileV1 } from "@/types/preset";

export interface DrumhausContextValue {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
  loadPreset: (preset: PresetFileV1) => void;
}

export const DrumhausContext = createContext<DrumhausContextValue | null>(null);
