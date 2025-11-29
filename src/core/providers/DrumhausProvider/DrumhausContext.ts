import { createContext, type RefObject } from "react";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import type { PresetFileV1 } from "@/features/preset/types/preset";

export interface DrumhausContextValue {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
  instrumentRuntimesVersion: number;
  loadPreset: (preset: PresetFileV1) => void;
}

export const DrumhausContext = createContext<DrumhausContextValue | null>(null);
