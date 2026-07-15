import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { loadKit } from "@/core/dhkit";
import {
  InstrumentData,
  InstrumentParams,
} from "@/features/instrument/types/instrument";

// No persist middleware: instruments persist inside the session document
// (features/preset/session), restored by bootstrapSession() before React
// mounts. The retired v1 -> v2 persist migrate (release -> decay,
// pitch -> tune) now lives in the legacy session adopter
// (legacy-adopter.ts).

interface InstrumentsState {
  // Array of 8 instruments with all their parameters
  instruments: InstrumentData[];

  // Actions - granular property setters (prevents cross-instrument re-renders)
  setInstrumentProperty: <K extends keyof InstrumentParams>(
    index: number,
    key: K,
    value: InstrumentParams[K],
  ) => void;
  toggleMute: (index: number) => void;
  toggleSolo: (index: number) => void;

  // Batch actions for kit/preset loading
  setAllInstruments: (instruments: InstrumentData[]) => void;
}

const useInstrumentsStore = create<InstrumentsState>()(
  devtools(
    immer((set) => ({
      // Initial state - default kit (kit-0)
      instruments: loadKit("kit-0")!.instruments,

      setInstrumentProperty: (index, key, value) => {
        set((state) => {
          state.instruments[index].params[key] = value;
        });
      },

      toggleMute: (index) => {
        set((state) => {
          state.instruments[index].params.mute =
            !state.instruments[index].params.mute;
        });
      },

      toggleSolo: (index) => {
        set((state) => {
          state.instruments[index].params.solo =
            !state.instruments[index].params.solo;
        });
      },

      // Batch setters for kit/preset loading
      setAllInstruments: (instruments) => {
        set({ instruments });
      },
    })),
    {
      name: "InstrumentsStore",
    },
  ),
);

export { useInstrumentsStore };
