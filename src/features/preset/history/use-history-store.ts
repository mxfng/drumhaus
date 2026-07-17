/**
 * Undo/redo stacks for the preset document (#240).
 *
 * History entries are full PresetDocument snapshots, not commands: the
 * document is a few KB, snapshot() -> apply() is a bit-exact identity round
 * trip, and the canonical hash makes dedup exact, so whole-document
 * snapshots are cheaper to get right than inverse operations and can never
 * drift from what a save would contain.
 *
 * This store is pure stack bookkeeping (record/step, dedup, cap); capturing
 * changes and replaying entries through the apply pipeline lives in
 * history.ts. `present` is the last committed snapshot - the state the
 * stores currently hold, kept here so record() can push it into the past
 * without re-reading the stores.
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { PresetDocument } from "@/features/preset/document";
import { hashPresetDocument } from "@/features/preset/session/canonical-hash";

/**
 * Bounded depth: 100 entries of a few KB each keeps the whole history well
 * under a megabyte while covering far more steps than anyone walks back.
 */
const HISTORY_LIMIT = 100;

interface HistoryState {
  /** Older snapshots, oldest first; undo steps back from the end. */
  past: PresetDocument[];
  /** The last committed snapshot (what the stores hold), null until seeded. */
  present: PresetDocument | null;
  /** Canonical hash of `present`, cached for record()'s dedup check. */
  presentHash: string | null;
  /** Undone snapshots, nearest first; redo steps forward from the front. */
  future: PresetDocument[];

  /** Establish the baseline snapshot without creating an undo entry. */
  seed: (document: PresetDocument) => void;

  /**
   * Commit a new snapshot: the previous present becomes undoable and any
   * redo entries are invalidated. A snapshot whose canonical hash matches
   * the present is dropped (no-op store writes must not create entries).
   */
  record: (document: PresetDocument) => void;

  /** Move one entry into the future; returns the new present, or null. */
  stepBack: () => PresetDocument | null;

  /** Move one entry back from the future; returns the new present, or null. */
  stepForward: () => PresetDocument | null;
}

const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      past: [],
      present: null,
      presentHash: null,
      future: [],

      seed: (document) => {
        set({ present: document, presentHash: hashPresetDocument(document) });
      },

      record: (document) => {
        const { past, present, presentHash } = get();
        if (present === null) {
          get().seed(document);
          return;
        }

        const hash = hashPresetDocument(document);
        if (hash === presentHash) return;

        set({
          past: [...past, present].slice(-HISTORY_LIMIT),
          present: document,
          presentHash: hash,
          future: [],
        });
      },

      stepBack: () => {
        const { past, present, future } = get();
        const target = past[past.length - 1];
        if (target === undefined || present === null) return null;

        set({
          past: past.slice(0, -1),
          present: target,
          presentHash: hashPresetDocument(target),
          future: [present, ...future],
        });
        return target;
      },

      stepForward: () => {
        const { past, present, future } = get();
        const target = future[0];
        if (target === undefined || present === null) return null;

        set({
          past: [...past, present],
          present: target,
          presentHash: hashPresetDocument(target),
          future: future.slice(1),
        });
        return target;
      },
    }),
    { name: "PresetHistoryStore" },
  ),
);

export { HISTORY_LIMIT, useHistoryStore };
