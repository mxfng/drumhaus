import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface InstrumentsState {
  // Instrument parameters (arrays of 8 values, indexed by instrument ID)
  attacks: number[];
  releases: number[];
  filters: number[];
  volumes: number[];
  pans: number[];
  mutes: boolean[];
  solos: boolean[];
  pitches: number[];
  durations: number[];

  // Actions - individual setters per instrument (prevents cross-instrument re-renders)
  setAttack: (instrumentId: number, value: number) => void;
  setRelease: (instrumentId: number, value: number) => void;
  setFilter: (instrumentId: number, value: number) => void;
  setVolume: (instrumentId: number, value: number) => void;
  setPan: (instrumentId: number, value: number) => void;
  setPitch: (instrumentId: number, value: number) => void;
  setDuration: (instrumentId: number, value: number) => void;
  toggleMute: (instrumentId: number) => void;
  toggleSolo: (instrumentId: number) => void;

  // Batch actions for preset loading
  setAllAttacks: (attacks: number[]) => void;
  setAllReleases: (releases: number[]) => void;
  setAllFilters: (filters: number[]) => void;
  setAllVolumes: (volumes: number[]) => void;
  setAllPans: (pans: number[]) => void;
  setAllMutes: (mutes: boolean[]) => void;
  setAllSolos: (solos: boolean[]) => void;
  setAllPitches: (pitches: number[]) => void;
  setAllDurations: (durations: number[]) => void;
}

export const useInstrumentsStore = create<InstrumentsState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state - default values for 8 instruments
        attacks: [50, 50, 50, 50, 50, 50, 50, 50],
        releases: [50, 50, 50, 50, 50, 50, 50, 50],
        filters: [50, 50, 50, 50, 50, 50, 50, 50],
        volumes: [92, 92, 92, 92, 92, 92, 92, 92],
        pans: [50, 50, 50, 50, 50, 50, 50, 50],
        mutes: [false, false, false, false, false, false, false, false],
        solos: [false, false, false, false, false, false, false, false],
        pitches: [50, 50, 50, 50, 50, 50, 50, 50],
        durations: [0, 0, 0, 0, 0, 0, 0, 0],

        // Individual instrument setters (with Immer, we can mutate directly)
        setAttack: (instrumentId, value) => {
          set((state) => {
            state.attacks[instrumentId] = value;
          });
        },

        setRelease: (instrumentId, value) => {
          set((state) => {
            state.releases[instrumentId] = value;
          });
        },

        setFilter: (instrumentId, value) => {
          set((state) => {
            state.filters[instrumentId] = value;
          });
        },

        setVolume: (instrumentId, value) => {
          set((state) => {
            state.volumes[instrumentId] = value;
          });
        },

        setPan: (instrumentId, value) => {
          set((state) => {
            state.pans[instrumentId] = value;
          });
        },

        setPitch: (instrumentId, value) => {
          set((state) => {
            state.pitches[instrumentId] = value;
          });
        },

        setDuration: (instrumentId, value) => {
          set((state) => {
            state.durations[instrumentId] = value;
          });
        },

        toggleMute: (instrumentId) => {
          set((state) => {
            state.mutes[instrumentId] = !state.mutes[instrumentId];
          });
        },

        toggleSolo: (instrumentId) => {
          set((state) => {
            state.solos[instrumentId] = !state.solos[instrumentId];
          });
        },

        // Batch setters for preset loading
        setAllAttacks: (attacks) => {
          set({ attacks });
        },

        setAllReleases: (releases) => {
          set({ releases });
        },

        setAllFilters: (filters) => {
          set({ filters });
        },

        setAllVolumes: (volumes) => {
          set({ volumes });
        },

        setAllPans: (pans) => {
          set({ pans });
        },

        setAllMutes: (mutes) => {
          set({ mutes });
        },

        setAllSolos: (solos) => {
          set({ solos });
        },

        setAllPitches: (pitches) => {
          set({ pitches });
        },

        setAllDurations: (durations) => {
          set({ durations });
        },
      })),
      {
        name: "drumhaus-instruments-storage",
        // Persist all instrument parameters
        partialize: (state) => ({
          attacks: state.attacks,
          releases: state.releases,
          filters: state.filters,
          volumes: state.volumes,
          pans: state.pans,
          mutes: state.mutes,
          solos: state.solos,
          pitches: state.pitches,
          // Don't persist durations (computed from samples)
        }),
      },
    ),
    {
      name: "InstrumentsStore",
    },
  ),
);
