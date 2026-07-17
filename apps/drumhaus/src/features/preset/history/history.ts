/**
 * Undo/redo capture and restore (#240).
 *
 * Capture mirrors the session autosave writer (use-session-autosave.ts): one
 * subscriber over the five musical stores, coalesced into whole-document
 * commits on the history stacks. Two mechanisms decide what "one change" is:
 *
 * - Gesture brackets: continuous input (knob drags, slider drags, sequencer
 *   drag-paint, velocity scrubs) opens a gesture via beginHistoryGesture and
 *   commits once on endHistoryGesture, so a whole drag is one undo unit.
 * - A short trailing debounce: everything else (step toggles, mute/solo,
 *   preset loads writing five stores back-to-back) batches within the window
 *   into one commit. The window is deliberately shorter than the autosave's:
 *   it separates distinct user actions, not save points.
 *
 * Restore replays a stack entry through applyPresetDocument with the
 * "restore" intent: playback keeps running unless the kit changed, the
 * performance selection (variation, sequencer mode) is preserved, and the
 * clean dirty baseline is untouched so unsaved-change detection keeps
 * comparing against the last real save. Store writes made by a restore are
 * ignored by the capture subscriber (isRestoring), and would hash-dedup to
 * no-ops regardless.
 */

import { useEffect } from "react";

import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import type { PresetDocument } from "@/features/preset/document";
import { applyPresetDocument } from "@/features/preset/document/apply";
import { snapshotPresetDocument } from "@/features/preset/document/snapshot";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { useHistoryStore } from "./use-history-store";

const HISTORY_COMMIT_DEBOUNCE_MS = 150;

// Capture state lives at module level rather than in the subscriber closure:
// gesture brackets are called from window-level pointer handlers that exist
// independently of the capture's mount lifetime.
let commitTimer: ReturnType<typeof setTimeout> | null = null;
let gestureDepth = 0;
let changedDuringGesture = false;
let isRestoring = false;
let hasWarned = false;

function warnOnce(error: unknown): void {
  if (hasWarned) return;
  hasWarned = true;
  console.warn(
    "Drumhaus history: snapshot failed; undo will miss this change",
    error,
  );
}

function takeSnapshot(): PresetDocument {
  const { currentPresetMeta, currentKitMeta } = usePresetMetaStore.getState();
  return snapshotPresetDocument(currentPresetMeta, currentKitMeta);
}

function commitNow(): void {
  // A timer scheduled before a gesture opened (e.g. the pointer-down edit
  // lands a store write before the gesture effect runs) must not commit a
  // mid-drag state; fold it into the gesture's single end-commit instead.
  if (gestureDepth > 0) {
    changedDuringGesture = true;
    return;
  }
  try {
    useHistoryStore.getState().record(takeSnapshot());
  } catch (error) {
    // A snapshot failure is a bug (unserializable store state); history
    // must never take the app down over it.
    warnOnce(error);
  }
}

function cancelPendingCommit(): void {
  if (commitTimer === null) return;
  clearTimeout(commitTimer);
  commitTimer = null;
}

function scheduleCommit(): void {
  if (isRestoring) return;
  if (gestureDepth > 0) {
    changedDuringGesture = true;
    return;
  }
  cancelPendingCommit();
  commitTimer = setTimeout(() => {
    commitTimer = null;
    commitNow();
  }, HISTORY_COMMIT_DEBOUNCE_MS);
}

/** Commit anything pending so undo/redo operates on the latest edit. */
function flushPendingCommit(): void {
  const pendingGestureChange = changedDuringGesture;
  changedDuringGesture = false;
  if (commitTimer !== null || pendingGestureChange) {
    cancelPendingCommit();
    try {
      useHistoryStore.getState().record(takeSnapshot());
    } catch (error) {
      warnOnce(error);
    }
  }
}

/**
 * Open a gesture: store changes are held and committed as one entry when the
 * last open gesture ends. Callers must pair every begin with exactly one
 * end (param-control's onGestureStart/onGestureEnd already guarantee this).
 */
function beginHistoryGesture(): void {
  gestureDepth += 1;
}

function endHistoryGesture(): void {
  gestureDepth = Math.max(0, gestureDepth - 1);
  if (gestureDepth === 0 && changedDuringGesture) {
    changedDuringGesture = false;
    cancelPendingCommit();
    commitNow();
  }
}

/**
 * Spread into a param control (RotaryKnob, LinearSlider, ValueField) so a
 * drag, type-in, or discrete commit brackets as one undo unit.
 */
const historyGestureHandlers = {
  onGestureStart: beginHistoryGesture,
  onGestureEnd: endHistoryGesture,
} as const;

/**
 * Restore a snapshot through the apply pipeline. Returns false if the apply
 * threw (before any store write - see applyPresetDocument's all-or-nothing
 * conversion phase), so the caller can revert its stack step.
 */
function restoreSnapshot(document: PresetDocument): boolean {
  isRestoring = true;
  try {
    applyPresetDocument(document, { intent: "restore" });
    return true;
  } catch (error) {
    console.error("Drumhaus history: failed to restore a snapshot", error);
    return false;
  } finally {
    isRestoring = false;
  }
}

/** Undo the last committed change. No-op when there is nothing to undo. */
function undo(): void {
  flushPendingCommit();
  const history = useHistoryStore.getState();
  const target = history.stepBack();
  if (target === null) return;
  if (!restoreSnapshot(target)) history.stepForward();
}

/** Redo the last undone change. No-op when there is nothing to redo. */
function redo(): void {
  flushPendingCommit();
  const history = useHistoryStore.getState();
  const target = history.stepForward();
  if (target === null) return;
  if (!restoreSnapshot(target)) history.stepBack();
}

/**
 * Start the capture: seed the baseline from the current stores (the boot
 * session restore has already applied a document by the time the app
 * mounts) and subscribe to the five musical stores. Returns a dispose
 * function. Plain function so tests can drive it without React.
 */
function startHistoryCapture(): () => void {
  if (useHistoryStore.getState().present === null) {
    try {
      useHistoryStore.getState().seed(takeSnapshot());
    } catch (error) {
      warnOnce(error);
    }
  }

  const unsubscribes = [
    useInstrumentsStore.subscribe(scheduleCommit),
    usePatternStore.subscribe(scheduleCommit),
    useTransportStore.subscribe(scheduleCommit),
    useMasterChainStore.subscribe(scheduleCommit),
    // Meta identity is part of the snapshot (a preset load or save-as
    // changes it); pure baseline/library writes hash-dedup to no-ops.
    usePresetMetaStore.subscribe(scheduleCommit),
  ];

  return () => {
    for (const unsubscribe of unsubscribes) unsubscribe();
    cancelPendingCommit();
    gestureDepth = 0;
    changedDuringGesture = false;
  };
}

/** Mounts the history capture for the lifetime of the app. */
function useHistoryCapture(): void {
  useEffect(() => startHistoryCapture(), []);
}

export {
  beginHistoryGesture,
  endHistoryGesture,
  HISTORY_COMMIT_DEBOUNCE_MS,
  historyGestureHandlers,
  redo,
  startHistoryCapture,
  undo,
  useHistoryCapture,
};
