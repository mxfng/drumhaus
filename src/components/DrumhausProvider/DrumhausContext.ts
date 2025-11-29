import { createContext, type MutableRefObject } from "react";

import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";

export interface DrumhausContextValue {
  instrumentRuntimes: MutableRefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
  loadPreset: (preset: PresetFileV1) => void;
}

export const DrumhausContext = createContext<DrumhausContextValue | null>(null);
