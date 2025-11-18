import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type { InstrumentData } from "@/types/types";

// Default instrument parameters
const createDefaultInstrument = (
  name: string = "",
  url: string = "",
): InstrumentData => ({
  name,
  url,
  attack: 0,
  release: 100,
  filter: 50,
  volume: 92,
  pan: 50,
  pitch: 50,
  solo: false,
  mute: false,
});

interface InstrumentsState {
  // Array of 8 instruments with all their parameters
  instruments: InstrumentData[];
  // Sample durations (runtime-computed, not persisted)
  durations: number[];

  // Actions - granular property setters (prevents cross-instrument re-renders)
  setInstrumentProperty: <K extends keyof InstrumentData>(
    index: number,
    key: K,
    value: InstrumentData[K],
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
            state.instruments[index][key] = value;
          });
        },

        toggleMute: (index) => {
          set((state) => {
            state.instruments[index].mute = !state.instruments[index].mute;
          });
        },

        toggleSolo: (index) => {
          set((state) => {
            state.instruments[index].solo = !state.instruments[index].solo;
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
        // Persist instruments but not durations (computed from samples)
        partialize: (state) => ({
          instruments: state.instruments,
        }),
      },
    ),
    {
      name: "InstrumentsStore",
    },
  ),
);
