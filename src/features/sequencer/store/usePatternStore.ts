import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import {
  appendChainDraftStep,
  clampVariationId,
  DEFAULT_CHAIN,
  legacyCycleToChain,
  sanitizeChain,
} from "@/features/sequencer/lib/chain";
import {
  applyInstrumentClipboard,
  applyVariationClipboard,
  createVariationClipboard,
} from "@/features/sequencer/lib/clipboard";
import { createEmptyPattern } from "@/features/sequencer/lib/helpers";
import { migratePatternUnsafe } from "@/features/sequencer/lib/migrations";
import {
  adjustTimingNudge,
  setTimingNudge,
  setVelocity,
  toggleAccent,
  toggleFlam,
  toggleRatchet,
  toggleStep,
} from "@/features/sequencer/lib/patternMutations";
import {
  ClipboardContent,
  CopySource,
} from "@/features/sequencer/types/clipboard";
import { Pattern, TimingNudge } from "@/features/sequencer/types/pattern";
import { triggerScreenFlash } from "@/shared/store/useScreenFlashStore";
import { clearInstrumentVariation, clearVariationPatterns } from "../lib/clear";
import {
  buildInstrumentClipboardState,
  buildInstrumentPasteFlashFromContext,
  buildVariationPasteFlashFromContext,
  resolveInstrumentMeta,
} from "../lib/paste";
import {
  buildInstrumentClearFlash,
  buildInstrumentCopyFlash,
  buildVariationClearFlash,
  buildVariationCopyFlash,
} from "../lib/screenFlash";
import { PatternChain, VariationCycle, VariationId } from "../types/sequencer";

/**
 * Sequencer mode - represents what the user is currently editing.
 * Modes are mutually exclusive and determine sequencer grid behavior.
 */
export type SequencerMode =
  | { type: "voice"; voiceIndex: number } // Editing a specific voice/instrument pattern
  | { type: "accent" } // Editing accent pattern (variation-level)
  | { type: "ratchet"; voiceIndex: number } // Editing ratchet pattern for voice
  | { type: "flam"; voiceIndex: number } // Editing flam pattern for voice
  | { type: "copy" } // Selecting copy source (instrument or variation)
  | { type: "paste" } // Selecting paste destination
  | { type: "clear" } // Clearing instrument/variation patterns
  | { type: "variationChain" }; // Variation chain mode

interface PatternState {
  // Pattern data - 8 voices, each with instrumentIndex and 4 variations
  pattern: Pattern;
  patternVersion: number;

  // Sequencer controls
  variation: VariationId; // A = 0, B = 1, C = 2, D = 3
  chain: PatternChain;
  chainEnabled: boolean;
  chainVersion: number;
  chainDraft: PatternChain;

  // Current voice index (tracked separately for mode memory)
  voiceIndex: number;

  // Sequencer mode (not persisted - UI state only)
  mode: SequencerMode;

  // Playback context (which variation is actually being played by the engine)
  playbackVariation: VariationId; // Mirrors the engine's active variation (A = 0, B = 1)

  // Clipboard (not persisted - session only)
  clipboard: ClipboardContent | null;
  copySource: CopySource | null;

  // Actions
  setVariation: (variation: number) => void;
  setChain: (chain: PatternChain) => void;
  setChainEnabled: (enabled: boolean) => void;
  startChainEdit: () => void;
  resetChainDraft: () => void;
  writeChainStep: (variation: VariationId) => void;
  setPattern: (pattern: Pattern) => void;
  setPlaybackVariation: (variation: number) => void;

  // Mode actions
  setMode: (mode: SequencerMode) => void;
  setVoiceMode: (voiceIndex: number) => void;
  toggleAccentMode: () => void;
  toggleRatchetMode: () => void;
  toggleFlamMode: () => void;

  // Copy/paste/clear actions
  enterCopyMode: () => void;
  togglePasteMode: () => void;
  exitCopyPasteMode: () => void;
  toggleClearMode: () => void;
  copyInstrument: (voiceIndex: number) => void;
  copyVariation: (variationId: VariationId) => void;
  pasteToInstrument: (voiceIndex: number) => void;
  pasteToVariation: (variationId: VariationId) => void;
  clearInstrument: (voiceIndex: number) => void;
  clearVariation: (variationId: VariationId) => void;

  // Pattern manipulation
  toggleStep: (
    voiceIndex: number,
    variation: VariationId,
    step: number,
  ) => void;
  setVelocity: (
    voiceIndex: number,
    variation: VariationId,
    step: number,
    velocity: number,
  ) => void;

  // Accent manipulation
  toggleAccent: (variation: VariationId, step: number) => void;

  // Ratchet manipulation
  toggleRatchet: (
    voiceIndex: number,
    variation: VariationId,
    step: number,
  ) => void;

  // Flam manipulation
  toggleFlam: (
    voiceIndex: number,
    variation: VariationId,
    step: number,
  ) => void;

  // Timing nudge
  nudgeTimingLeft: () => void;
  nudgeTimingRight: () => void;
  setTimingNudge: (
    voiceIndex: number,
    variation: VariationId,
    nudge: TimingNudge,
  ) => void;
}

export const usePatternStore = create<PatternState>()(
  devtools(
    persist(
      immer((set) => ({
        // Initial state
        pattern: createEmptyPattern(),
        patternVersion: 0,
        variation: 0,
        chain: DEFAULT_CHAIN,
        chainEnabled: false,
        chainVersion: 0,
        chainDraft: { steps: [] },
        mode: { type: "voice", voiceIndex: 0 },
        playbackVariation: 0,
        voiceIndex: 0,

        // Clipboard (not persisted)
        clipboard: null,
        copySource: null,

        // Actions
        setVariation: (variation) => {
          set({ variation: clampVariationId(variation) });
        },

        setChain: (chain) => {
          set((state) => {
            state.chain = sanitizeChain(chain);
            state.chainVersion += 1;
          });
        },

        setChainEnabled: (enabled) => {
          set((state) => {
            state.chainEnabled = enabled;
            state.chainVersion += 1;
          });
        },

        startChainEdit: () => {
          set({
            chainDraft: { steps: [] },
            mode: { type: "variationChain" },
          });
        },

        resetChainDraft: () => {
          set((state) => {
            state.chainDraft = { steps: [] };
          });
        },

        writeChainStep: (variation) => {
          set((state) => {
            if (state.mode.type !== "variationChain") {
              state.variation = clampVariationId(variation);
              return;
            }

            state.chainDraft = appendChainDraftStep(
              state.chainDraft,
              variation,
            );
          });
        },

        setMode: (mode) => {
          if (mode.type === "voice") {
            set({ voiceIndex: mode.voiceIndex });
          }
          set({ mode });
        },

        setVoiceMode: (voiceIndex) => {
          set((state) => {
            if (state.mode.type === "ratchet" || state.mode.type === "flam") {
              // If in ratchet or flam mode, just update the voice index
              return {
                voiceIndex,
                mode: { type: state.mode.type, voiceIndex },
              };
            } else {
              // Otherwise, update both the voice index and mode
              return { voiceIndex, mode: { type: "voice", voiceIndex } };
            }
          });
        },

        toggleAccentMode: () => {
          set((state) => {
            if (state.mode.type === "accent") {
              // Exit accent mode, return to last voice
              return { mode: { type: "voice", voiceIndex: state.voiceIndex } };
            } else {
              // Enter accent mode
              return { mode: { type: "accent" } };
            }
          });
        },

        toggleRatchetMode: () => {
          set((state) => {
            if (state.mode.type === "ratchet") {
              return { mode: { type: "voice", voiceIndex: state.voiceIndex } };
            } else {
              return {
                mode: { type: "ratchet", voiceIndex: state.voiceIndex },
              };
            }
          });
        },

        toggleFlamMode: () => {
          set((state) => {
            if (state.mode.type === "flam") {
              return { mode: { type: "voice", voiceIndex: state.voiceIndex } };
            } else {
              return { mode: { type: "flam", voiceIndex: state.voiceIndex } };
            }
          });
        },

        enterCopyMode: () => {
          set({ mode: { type: "copy" } });
        },

        togglePasteMode: () => {
          set((state) => {
            // Only allow paste mode if we have something on clipboard
            if (!state.clipboard) return;

            if (state.mode.type === "paste") {
              // Exit paste mode
              return { mode: { type: "voice", voiceIndex: state.voiceIndex } };
            } else {
              // Enter paste mode
              return { mode: { type: "paste" } };
            }
          });
        },

        exitCopyPasteMode: () => {
          set((state) => ({
            mode: { type: "voice", voiceIndex: state.voiceIndex },
          }));
        },

        toggleClearMode: () => {
          set((state) => {
            const isClearMode = state.mode.type === "clear";
            return {
              mode: isClearMode
                ? { type: "voice", voiceIndex: state.voiceIndex }
                : { type: "clear" },
            };
          });
        },

        copyInstrument: (voiceIndex) => {
          set((state) => {
            const instruments = useInstrumentsStore.getState().instruments;
            const { clipboard, source } = buildInstrumentClipboardState(
              state.pattern,
              voiceIndex,
              state.variation,
              instruments,
            );

            triggerScreenFlash(
              buildInstrumentCopyFlash(
                instruments[voiceIndex]?.meta,
                state.variation,
              ),
            );

            return {
              clipboard,
              copySource: source,
              mode: { type: "paste" },
            };
          });
        },

        copyVariation: (variationId) => {
          set((state) => {
            const { clipboard, source } = createVariationClipboard(
              state.pattern,
              variationId,
            );

            triggerScreenFlash(buildVariationCopyFlash(variationId));

            return {
              clipboard,
              copySource: source,
              mode: { type: "paste" },
            };
          });
        },

        pasteToInstrument: (voiceIndex) => {
          set((state) => {
            if (
              applyInstrumentClipboard(
                state.pattern,
                state.clipboard,
                voiceIndex,
                state.variation,
              )
            ) {
              state.patternVersion += 1;
              const instruments = useInstrumentsStore.getState().instruments;
              const flashPayload = buildInstrumentPasteFlashFromContext({
                clipboard: state.clipboard,
                copySource: state.copySource,
                targetVoiceIndex: voiceIndex,
                targetVariation: state.variation,
                instruments,
              });

              if (flashPayload) {
                triggerScreenFlash(flashPayload);
              }
            }
            state.mode = { type: "voice", voiceIndex };
          });
        },

        pasteToVariation: (variationId) => {
          set((state) => {
            if (state.clipboard?.type === "variation") {
              if (
                applyVariationClipboard(
                  state.pattern,
                  state.clipboard,
                  variationId,
                )
              ) {
                state.patternVersion += 1;
                triggerScreenFlash(
                  buildVariationPasteFlashFromContext(
                    state.copySource?.variationId,
                    variationId,
                  ),
                );
              }
            } else if (
              state.clipboard?.type === "instrument" &&
              state.copySource
            ) {
              if (
                applyInstrumentClipboard(
                  state.pattern,
                  state.clipboard,
                  state.copySource.type === "instrument"
                    ? state.copySource.voiceIndex
                    : 0,
                  variationId,
                )
              ) {
                state.patternVersion += 1;
                const targetVoiceIndex =
                  state.copySource.type === "instrument"
                    ? state.copySource.voiceIndex
                    : 0;
                const instruments = useInstrumentsStore.getState().instruments;
                const flashPayload = buildInstrumentPasteFlashFromContext({
                  clipboard: state.clipboard,
                  copySource: state.copySource,
                  targetVoiceIndex,
                  targetVariation: variationId,
                  instruments,
                });

                if (flashPayload) {
                  triggerScreenFlash(flashPayload);
                }
              }
            }
            state.mode = { type: "voice", voiceIndex: state.voiceIndex };
          });
        },

        clearInstrument: (voiceIndex) => {
          set((state) => {
            clearInstrumentVariation(
              state.pattern,
              voiceIndex,
              state.variation as VariationId,
            );
            state.patternVersion += 1;

            const instruments = useInstrumentsStore.getState().instruments;
            const meta = resolveInstrumentMeta(instruments, voiceIndex);

            triggerScreenFlash(
              buildInstrumentClearFlash({
                meta,
                variation: state.variation as VariationId,
              }),
            );

            state.mode = { type: "voice", voiceIndex };
          });
        },

        clearVariation: (variationId) => {
          set((state) => {
            clearVariationPatterns(state.pattern, variationId);
            state.patternVersion += 1;

            triggerScreenFlash(buildVariationClearFlash(variationId));

            state.mode = { type: "voice", voiceIndex: state.voiceIndex };
          });
        },

        setPattern: (pattern) => {
          set((state) => {
            state.pattern = pattern;
            state.patternVersion += 1;
          });
        },

        setPlaybackVariation: (variation) => {
          set({ playbackVariation: clampVariationId(variation) });
        },

        toggleStep: (voiceIndex, variation, step) => {
          set((state) => {
            toggleStep(state.pattern, voiceIndex, variation, step);
            state.patternVersion += 1;
          });
        },

        setVelocity: (voiceIndex, variation, step, velocity) => {
          set((state) => {
            setVelocity(state.pattern, voiceIndex, variation, step, velocity);
            state.patternVersion += 1;
          });
        },

        toggleAccent: (variation, step) => {
          set((state) => {
            toggleAccent(state.pattern, variation, step);
            state.patternVersion += 1;
          });
        },

        toggleRatchet: (voiceIndex, variation, step) => {
          set((state) => {
            toggleRatchet(state.pattern, voiceIndex, variation, step);
            state.patternVersion += 1;
          });
        },

        toggleFlam: (voiceIndex, variation, step) => {
          set((state) => {
            toggleFlam(state.pattern, voiceIndex, variation, step);
            state.patternVersion += 1;
          });
        },

        nudgeTimingLeft: () => {
          set((state) => {
            // Only works in voice mode
            if (state.mode.type !== "voice") return;

            const { voiceIndex } = state.mode;
            const { variation } = state;
            adjustTimingNudge(state.pattern, voiceIndex, variation, -1);
            state.patternVersion += 1;
          });
        },

        nudgeTimingRight: () => {
          set((state) => {
            // Only works in voice mode
            if (state.mode.type !== "voice") return;

            const { voiceIndex } = state.mode;
            const { variation } = state;
            adjustTimingNudge(state.pattern, voiceIndex, variation, 1);
            state.patternVersion += 1;
          });
        },

        setTimingNudge: (voiceIndex, variation, nudge) => {
          set((state) => {
            setTimingNudge(state.pattern, voiceIndex, variation, nudge);
            state.patternVersion += 1;
          });
        },
      })),

      {
        name: "drumhaus-sequencer-storage",
        version: 3,
        // Persist pattern and settings
        partialize: (state) => ({
          pattern: state.pattern,
          patternVersion: state.patternVersion,
          variation: state.variation,
          chain: state.chain,
          chainEnabled: state.chainEnabled,
          chainVersion: state.chainVersion,
        }),
        // Migration: ensure all pattern fields are up-to-date
        migrate: (persistedState: unknown) => {
          const state = persistedState as Partial<PatternState> & {
            variationCycle?: VariationCycle;
          };

          // Migrate pattern to latest format (handles all versions)
          try {
            state.pattern = migratePatternUnsafe(
              state.pattern ?? createEmptyPattern(),
            );
          } catch (error) {
            console.error("Failed to migrate pattern:", error);
            state.pattern = createEmptyPattern();
          }

          const legacy = legacyCycleToChain(
            state.variationCycle,
            state.variation ?? 0,
          );

          state.variation = clampVariationId(
            state.variation ?? legacy.variation,
          );
          state.chain = sanitizeChain(state.chain ?? legacy.chain);
          state.chainEnabled = state.chainEnabled ?? legacy.chainEnabled;
          state.chainVersion = state.chainVersion ?? 0;
          state.chainDraft = { steps: [] };

          return state as PatternState;
        },
      },
    ),
    {
      name: "SequencerStore",
    },
  ),
);
