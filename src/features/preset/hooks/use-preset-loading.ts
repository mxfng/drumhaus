import { useCallback, useEffect, useRef } from "react";

import { init } from "@/core/dh";
import {
  decodePresetFileText,
  migrateV1ToDocument,
  validatePresetFileV1,
  type PresetDocument,
} from "@/features/preset/document";
import { applyPresetDocument } from "@/features/preset/document/apply";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import { useToast, type ToastContextValue } from "@/shared/ui";

type ShowToast = ToastContextValue["toast"];

/**
 * Map a preset-pipeline failure to its user-facing toast. Typed
 * PresetDocumentErrors carry user-facing messages (document/errors.ts);
 * anything else falls back to generic copy.
 */
function showPresetLoadErrorToast(toast: ShowToast, error: unknown): void {
  console.error("Failed to load preset:", error);
  toast({
    title: "Something went wrong",
    description:
      error instanceof Error
        ? error.message
        : "Couldn't open file. It may be invalid or corrupted.",
    status: "error",
    duration: 8000,
  });
}

/**
 * The single error boundary for every preset ingress. `produce` runs the
 * decode/migrate/validate half of the pipeline, so any failure (invalid
 * file, unsupported version, corrupt field, unknown kit) throws before
 * applyPresetDocument writes the first store: a rejected preset leaves the
 * session exactly as it was.
 */
function loadPresetDocument(
  produce: () => PresetDocument,
  onError: (error: unknown) => void,
): PresetDocument | null {
  try {
    const document = produce();
    applyPresetDocument(document);
    return document;
  } catch (error) {
    onError(error);
    return null;
  }
}

/**
 * Load a knob-space (v1-family) preset object: library selections, the
 * delete fallback, the boot default, and post-save reloads. Library entries
 * are persisted verbatim in localStorage (until PR 6) and can still be
 * version 1 or corrupt, so they run the same validate -> migrate ladder as
 * imported file text before apply.
 */
function loadPresetFile(
  preset: PresetFileV1,
  toast: ShowToast,
): PresetDocument | null {
  return loadPresetDocument(
    () => migrateV1ToDocument(validatePresetFileV1(preset)),
    (error) => showPresetLoadErrorToast(toast, error),
  );
}

/** Load raw `.dh` file text (file import): decode -> apply. */
function loadPresetFileText(
  text: string,
  toast: ShowToast,
): PresetDocument | null {
  return loadPresetDocument(
    () => decodePresetFileText(text),
    (error) => showPresetLoadErrorToast(toast, error),
  );
}

interface UsePresetLoadingResult {
  loadPresetFile: (preset: PresetFileV1) => void;
  loadPresetFileText: (text: string) => PresetDocument | null;
}

/**
 * Loads presets through the document pipeline
 * (decode -> migrate -> validate -> apply) and updates all stores
 *
 * Low-level: handles audio engine, playback stopping, store updates
 */
function usePresetLoading(): UsePresetLoadingResult {
  const { toast } = useToast();

  const hasLoadedFromUrlRef = useRef(false);

  const loadFile = useCallback(
    (preset: PresetFileV1) => {
      loadPresetFile(preset, toast);
    },
    [toast],
  );

  const loadFileText = useCallback(
    (text: string) => loadPresetFileText(text, toast),
    [toast],
  );

  const showSharedPresetToast = useCallback(
    (presetName: string) => {
      toast({
        title: `Loaded shared preset "${presetName}"`,
      });
    },
    [toast],
  );

  const showSharedPresetErrorToast = useCallback(() => {
    toast({
      title: "Something went wrong",
      description: "Couldn't load shared preset. The link may be invalid.",
      status: "error",
      duration: 8000,
    });
  }, [toast]);

  const loadFromUrlOrDefault = useCallback(async () => {
    // Prevent duplicate execution
    if (hasLoadedFromUrlRef.current) {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get("p");

    if (!presetParam) {
      // Check if we have persisted store values in localStorage
      const hasPersistedData =
        typeof window !== "undefined" &&
        localStorage.getItem("drumhaus-preset-meta-storage") !== null;

      // TODO: Add validation to check if the persisted data is valid
      // This could potentially lead to corrupted projects if any states
      // are malformed.

      if (!hasPersistedData) {
        // No persisted data, load default init preset
        loadFile(init());
      }
      hasLoadedFromUrlRef.current = true;
      return;
    }

    // Mark as loaded before async operations to prevent race conditions
    hasLoadedFromUrlRef.current = true;

    const onSharedPresetError = (error: unknown) => {
      console.error("Failed to load shared preset:", error);
      showSharedPresetErrorToast();
      loadFile(init());
    };

    try {
      const { urlToDocument } =
        await import("@/features/preset/lib/serialization");
      // urlToDocument runs the full decode half of the pipeline: v2
      // payloads decode straight to a document, v1.5 payloads run the same
      // validate -> migrate rung as library presets, and versionless
      // (pre-#269) links are refused with a typed error.
      const document = loadPresetDocument(
        () => urlToDocument(presetParam),
        onSharedPresetError,
      );
      if (document !== null) {
        showSharedPresetToast(document.meta.name);
      }
    } catch (error) {
      // The serialization module itself failed to load (dynamic import).
      onSharedPresetError(error);
    } finally {
      // Remove URL parameters after loading preset
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      url.searchParams.delete("n");
      window.history.replaceState({}, "", url.toString());
    }
  }, [loadFile, showSharedPresetErrorToast, showSharedPresetToast]);

  // Load initial preset on mount
  useEffect(() => {
    void loadFromUrlOrDefault();
  }, [loadFromUrlOrDefault]);

  return { loadPresetFile: loadFile, loadPresetFileText: loadFileText };
}

export {
  usePresetLoading,
  loadPresetDocument,
  loadPresetFile,
  loadPresetFileText,
};
export type { UsePresetLoadingResult };
