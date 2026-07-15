import { createContext } from "react";

import type { PresetDocument } from "@/features/preset/document";
import type { PresetFileV1 } from "@/features/preset/types/preset";

interface DrumhausContextValue {
  loadPresetFile: (preset: PresetFileV1) => void;
  loadPresetFileText: (text: string) => PresetDocument | null;
}

const DrumhausContext = createContext<DrumhausContextValue | null>(null);

export { DrumhausContext };
export type { DrumhausContextValue };
