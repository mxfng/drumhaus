import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import {
  InstrumentData,
  InstrumentParams,
} from "@/core/audio/engine/instrument/types";
import { eightOhEight } from "@/core/dhkit";

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
        // Initial state - "808.dhkit"
        instruments: eightOhEight().instruments,
        durations: eightOhEight().instruments.map(() => 0), // update at runtime

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
        migrate: (persistedState: unknown, version: number) => {
          // Migrate from v1 to v2: rename release → decay, pitch → tune, remove attack
          if (version === 1) {
            const state = persistedState as { instruments: InstrumentData[] };
            state.instruments = state.instruments.map((inst) => {
              const oldParams = inst.params as unknown as Record<
                string,
                unknown
              >;
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { attack: _attack, release, pitch, ...rest } = oldParams;
              return {
                ...inst,
                params: {
                  ...rest,
                  decay: release ?? oldParams.decay,
                  tune: pitch ?? oldParams.tune,
                } as InstrumentParams,
              };
            });
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
