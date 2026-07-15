/**
 * Debounced session autosave (docs/preset-persistence.md, "Session storage:
 * the document replaces five persists"): one writer subscribed to the five
 * musical stores, replacing their five retired persist middlewares.
 *
 * Decision 6 says autosave IS the tab-close protection (no beforeunload
 * prompt), so pending writes flush immediately on pagehide and on
 * visibilitychange -> hidden: closing the tab right after an edit loses
 * nothing.
 *
 * Storage failures warn once per autosave lifetime on the console and never
 * toast: a private-browsing user should not be nagged per keystroke.
 */

import { useEffect } from "react";

import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { snapshotPresetDocument } from "@/features/preset/document/snapshot";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { writeSessionEnvelope } from "./session-storage";

const SESSION_AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * Start the autosave writer: subscribe to the five musical stores, debounce
 * store changes into one trailing write, and flush pending writes when the
 * page hides. Returns a dispose function (which flushes one last time).
 *
 * Plain function so the node test project can drive it without React; the
 * useSessionAutosave hook is the mount wrapper.
 */
function startSessionAutosave(): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let hasWarned = false;

  const warnOnce = (error?: unknown) => {
    if (hasWarned) return;
    hasWarned = true;
    console.warn(
      "Drumhaus session autosave failed; edits will not survive a reload",
      error,
    );
  };

  const write = () => {
    const { currentPresetMeta, currentKitMeta, cleanHash } =
      usePresetMetaStore.getState();
    try {
      const snapshot = snapshotPresetDocument(
        currentPresetMeta,
        currentKitMeta,
      );
      if (!writeSessionEnvelope(snapshot, cleanHash)) {
        warnOnce();
      }
    } catch (error) {
      // A snapshot failure is a bug (the stores hold unserializable state);
      // autosave must still never take the app down.
      warnOnce(error);
    }
  };

  const flush = () => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
    write();
  };

  const schedule = () => {
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      write();
    }, SESSION_AUTOSAVE_DEBOUNCE_MS);
  };

  const unsubscribes = [
    useInstrumentsStore.subscribe(schedule),
    usePatternStore.subscribe(schedule),
    useTransportStore.subscribe(schedule),
    useMasterChainStore.subscribe(schedule),
    // Covers clean-hash and meta changes so the envelope's baseline stays
    // current after saves and loads.
    usePresetMetaStore.subscribe(schedule),
  ];

  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") flush();
  };

  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    window.removeEventListener("pagehide", flush);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    for (const unsubscribe of unsubscribes) unsubscribe();
    flush();
  };
}

/** Mounts the session autosave writer for the lifetime of the app. */
function useSessionAutosave(): void {
  useEffect(() => startSessionAutosave(), []);
}

export {
  SESSION_AUTOSAVE_DEBOUNCE_MS,
  startSessionAutosave,
  useSessionAutosave,
};
