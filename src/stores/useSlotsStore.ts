import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface SlotsState {
  // Slot parameters (arrays of 8 values, indexed by slot ID)
  attacks: number[];
  releases: number[];
  filters: number[];
  volumes: number[];
  pans: number[];
  mutes: boolean[];
  solos: boolean[];
  pitches: number[];
  durations: number[];

  // Actions - individual setters per slot (prevents cross-slot re-renders)
  setAttack: (slotId: number, value: number) => void;
  setRelease: (slotId: number, value: number) => void;
  setFilter: (slotId: number, value: number) => void;
  setVolume: (slotId: number, value: number) => void;
  setPan: (slotId: number, value: number) => void;
  setPitch: (slotId: number, value: number) => void;
  setDuration: (slotId: number, value: number) => void;
  toggleMute: (slotId: number) => void;
  toggleSolo: (slotId: number) => void;

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

export const useSlotsStore = create<SlotsState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state - default values for 8 slots
        attacks: [50, 50, 50, 50, 50, 50, 50, 50],
        releases: [50, 50, 50, 50, 50, 50, 50, 50],
        filters: [50, 50, 50, 50, 50, 50, 50, 50],
        volumes: [92, 92, 92, 92, 92, 92, 92, 92],
        pans: [50, 50, 50, 50, 50, 50, 50, 50],
        mutes: [false, false, false, false, false, false, false, false],
        solos: [false, false, false, false, false, false, false, false],
        pitches: [50, 50, 50, 50, 50, 50, 50, 50],
        durations: [0, 0, 0, 0, 0, 0, 0, 0],

        // Individual slot setters (with Immer, we can mutate directly)
        setAttack: (slotId, value) => {
          set((state) => {
            state.attacks[slotId] = value;
          });
        },

        setRelease: (slotId, value) => {
          set((state) => {
            state.releases[slotId] = value;
          });
        },

        setFilter: (slotId, value) => {
          set((state) => {
            state.filters[slotId] = value;
          });
        },

        setVolume: (slotId, value) => {
          set((state) => {
            state.volumes[slotId] = value;
          });
        },

        setPan: (slotId, value) => {
          set((state) => {
            state.pans[slotId] = value;
          });
        },

        setPitch: (slotId, value) => {
          set((state) => {
            state.pitches[slotId] = value;
          });
        },

        setDuration: (slotId, value) => {
          set((state) => {
            state.durations[slotId] = value;
          });
        },

        toggleMute: (slotId) => {
          set((state) => {
            state.mutes[slotId] = !state.mutes[slotId];
          });
        },

        toggleSolo: (slotId) => {
          set((state) => {
            state.solos[slotId] = !state.solos[slotId];
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
        name: "drumhaus-slots-storage",
        // Persist all slot parameters
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
      }
    ),
    {
      name: "SlotsStore",
    }
  )
);
