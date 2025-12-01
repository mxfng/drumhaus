import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { drumhaus } from "@/core/dhkit";
import { InstrumentData, InstrumentParams } from "../types/instrument";

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
        // Initial state - "drumhaus.dhkit"
        instruments: drumhaus().instruments,
        durations: drumhaus().instruments.map(() => 0), // update at runtime

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
        version: 2,
        // Persist instruments but not durations (computed from samples)
        partialize: (state) => ({
          instruments: state.instruments,
        }),
        migrate: (persistedState: any, version: number) => {
          // Migrate from v1 to v2: rename release → decay, pitch → tune
          if (version === 1) {
            const state = persistedState as { instruments: InstrumentData[] };
            state.instruments = state.instruments.map((inst) => ({
              ...inst,
              params: {
                ...inst.params,
                decay: (inst.params as any).release ?? inst.params.decay,
                tune: (inst.params as any).pitch ?? inst.params.tune,
              },
            }));
          }
          return persistedState;
        },
      },
    ),
    {
      name: "InstrumentsStore",
    },
  ),
);
