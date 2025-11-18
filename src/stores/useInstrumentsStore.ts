import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { InstrumentData, InstrumentParams } from "@/types/instrument";

// Default instrument parameters
const createDefaultInstrument = (
  name: string = "",
  samplePath: string = "",
): InstrumentData => ({
  meta: {
    id: `inst-${Math.random().toString(36).substr(2, 9)}`,
    name,
  },
  role: "other",
  sample: {
    meta: {
      id: `sample-${Math.random().toString(36).substr(2, 9)}`,
      name,
    },
    path: samplePath,
  },
  params: {
    attack: 0,
    release: 100,
    filter: 50,
    volume: 92,
    pan: 50,
    pitch: 50,
    solo: false,
    mute: false,
  },
});

interface InstrumentsState {
  // Array of 8 instruments with all their parameters
  instruments: InstrumentData[];
  // Sample durations (runtime-computed, not persisted)
  durations: number[];

  // Actions - granular property setters (prevents cross-instrument re-renders)
  setInstrumentProperty: <K extends keyof InstrumentParams>(
    index: number,
    key: K,
    value: InstrumentParams[K],
  ) => void;
  toggleMute: (index: number) => void;
  toggleSolo: (index: number) => void;
  setDuration: (index: number, value: number) => void;

  // Batch actions for kit/preset loading
  setAllInstruments: (instruments: InstrumentData[]) => void;
  setAllDurations: (durations: number[]) => void;
}

export const useInstrumentsStore = create<InstrumentsState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state - 8 default instruments
        instruments: Array(8)
          .fill(null)
          .map(() => createDefaultInstrument()),
        durations: [0, 0, 0, 0, 0, 0, 0, 0],

        // Granular property setter (with Immer, we can mutate directly)
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

        setDuration: (index, value) => {
          set((state) => {
            state.durations[index] = value;
          });
        },

        // Batch setters for kit/preset loading
        setAllInstruments: (instruments) => {
          set({ instruments });
        },

        setAllDurations: (durations) => {
          set({ durations });
        },
      })),
      {
        name: "drumhaus-instruments-storage",
        version: 1, // Increment this when data structure changes
        // Persist instruments but not durations (computed from samples)
        partialize: (state) => ({
          instruments: state.instruments,
        }),
        // Migration function to handle old data format
        migrate: (persistedState: any, version: number) => {
          // If version is 0 (old format), clear the state
          if (version === 0) {
            return {
              instruments: Array(8)
                .fill(null)
                .map(() => createDefaultInstrument()),
              durations: [0, 0, 0, 0, 0, 0, 0, 0],
            };
          }
          return persistedState as InstrumentsState;
        },
      },
    ),
    {
      name: "InstrumentsStore",
    },
  ),
);
