import { createContext } from "react";

import type { PresetDocument } from "@/features/preset/document";

interface DrumhausContextValue {
  loadPresetDocument: (document: PresetDocument) => void;
  importPresetFileText: (text: string) => void;
}

const DrumhausContext = createContext<DrumhausContextValue | null>(null);

export { DrumhausContext };
export type { DrumhausContextValue };
