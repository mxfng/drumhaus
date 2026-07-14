import { createContext } from "react";

import type { PresetFileV1 } from "@/features/preset/types/preset";

interface DrumhausContextValue {
  loadPreset: (preset: PresetFileV1) => void;
}

const DrumhausContext = createContext<DrumhausContextValue | null>(null);

export { DrumhausContext };
export type { DrumhausContextValue };
