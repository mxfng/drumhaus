import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { Sequences } from "@/types/types";

interface SequencerState {
  // Sequence data - [8 slots][2 variations][2 (sequences/velocities)][16 steps]
  sequences: Sequences;

  // Sequencer controls
  variation: number; // A = 0, B = 1
  chain: number; // A = 0, B = 1, AB = 2, AAAB = 3
  slotIndex: number; // Currently selected slot (0-7)

  // Actions
  setVariation: (variation: number) => void;
  setChain: (chain: number) => void;
  setSlotIndex: (slotIndex: number) => void;
  setSequences: (sequences: Sequences) => void;

  // Sequence manipulation
  toggleStep: (slot: number, variation: number, step: number) => void;
  setVelocity: (slot: number, variation: number, step: number, velocity: number) => void;
  updateSequence: (slot: number, variation: number, sequence: boolean[], velocities: number[]) => void;
  clearSequence: (slot: number, variation: number) => void;

  // Computed getter
  getCurrentSequence: () => boolean[];
}

// Default empty sequences for 8 slots, 2 variations
const createEmptySequences = (): Sequences => {
  const slots = 8;
  const variations = 2;
  const steps = 16;

  return Array.from({ length: slots }, () =>
    Array.from({ length: variations }, () => [
      Array(steps).fill(false), // sequence pattern
      Array(steps).fill(1), // velocities
    ])
  ) as Sequences;
};

export const useSequencerStore = create<SequencerState>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        sequences: createEmptySequences(),
        variation: 0,
        chain: 0,
        slotIndex: 0,

        // Actions
        setVariation: (variation) => {
          set({ variation });
        },

        setChain: (chain) => {
          set({ chain });
        },

        setSlotIndex: (slotIndex) => {
          set({ slotIndex });
        },

        setSequences: (sequences) => {
          set({ sequences });
        },

        toggleStep: (slot, variation, step) => {
          set((state) => {
            const currentValue = state.sequences[slot][variation][0][step];
            state.sequences[slot][variation][0][step] = !currentValue;
            // Set default velocity to 1 when enabling a step
            if (!currentValue) {
              state.sequences[slot][variation][1][step] = 1;
            }
          });
        },

        setVelocity: (slot, variation, step, velocity) => {
          set((state) => {
            state.sequences[slot][variation][1][step] = velocity;
          });
        },

        updateSequence: (slot, variation, sequence, velocities) => {
          set((state) => {
            state.sequences[slot][variation][0] = sequence;
            state.sequences[slot][variation][1] = velocities;
          });
        },

        clearSequence: (slot, variation) => {
          set((state) => {
            state.sequences[slot][variation][0] = Array(16).fill(false);
            state.sequences[slot][variation][1] = Array(16).fill(1);
          });
        },

        getCurrentSequence: () => {
          const { sequences, slotIndex, variation } = get();
          return sequences[slotIndex][variation][0];
        },
      })),
      {
        name: "drumhaus-sequencer-storage",
        // Persist sequences and settings
        partialize: (state) => ({
          sequences: state.sequences,
          variation: state.variation,
          chain: state.chain,
          // Don't persist slotIndex (UI state)
        }),
      }
    ),
    {
      name: "SequencerStore",
    }
  )
);
