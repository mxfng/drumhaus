import { useCallback, useEffect, useRef } from "react";

import {
  decodePresetFileText,
  migrateV1ToDocument,
  validatePresetFileV1,
  type PresetDocument,
} from "@/features/preset/document";
import { applyPresetDocument } from "@/features/preset/document/apply";
import { requestGuardedPresetLoad } from "@/features/preset/store/use-pending-preset-load-store";
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
 * Load a knob-space (v1-family) preset object: factory-preset selections
 * and the delete fallback (boot itself now flows through
 * features/preset/session/bootstrap.ts, and library entries are documents
 * that go through loadStoredPresetDocument). Bundled files are validated at
 * import time, but the full validate -> migrate ladder keeps this ingress
 * identical to imported file text.
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

/**
 * Load an already-decoded preset document: library selections (entries are
 * stored as documents since PR 6) and post-save reloads. The document went
 * through the schema when it was decoded or snapshotted, so only apply's
 * conversion (kit resolution, domain-to-knob) can fail here; it shares the
 * ingress error boundary all the same.
 */
function loadStoredPresetDocument(
  document: PresetDocument,
  toast: ShowToast,
): PresetDocument | null {
  return loadPresetDocument(
    () => document,
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

/**
 * The file-import ingress with the unsaved-changes guard (decision 6's PR 5
 * extension): decode first, so a file that would fail anyway toasts its
 * typed error without ever prompting, then apply immediately (clean
 * session) or behind the shared confirm dialog (dirty session). Cancel
 * discards the decoded document and leaves the session untouched.
 */
function importPresetFileText(text: string, toast: ShowToast): void {
  let document: PresetDocument;
  try {
    document = decodePresetFileText(text);
  } catch (error) {
    showPresetLoadErrorToast(toast, error);
    return;
  }

  requestGuardedPresetLoad("file", () => {
    const applied = loadPresetDocument(
      () => document,
      (error) => showPresetLoadErrorToast(toast, error),
    );
    if (applied !== null) {
      toast({
        title: "Preset loaded",
        description: applied.meta.name,
        status: "success",
      });
    }
  });
}

interface UsePresetLoadingResult {
  loadPresetFile: (preset: PresetFileV1) => void;
  loadPresetDocument: (document: PresetDocument) => void;
  importPresetFileText: (text: string) => void;
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

  const loadDocument = useCallback(
    (document: PresetDocument) => {
      loadStoredPresetDocument(document, toast);
    },
    [toast],
  );

  const importFileText = useCallback(
    (text: string) => {
      importPresetFileText(text, toast);
    },
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
      // No share link: bootstrapSession() already restored the session (or
      // applied the default preset) synchronously before React mounted.
      hasLoadedFromUrlRef.current = true;
      return;
    }

    // Mark as loaded before async operations to prevent race conditions
    hasLoadedFromUrlRef.current = true;

    // No init() repair here: bootstrapSession() already restored a valid
    // session (or the default preset) before React mounted, so a failed
    // link keeps the user's session instead of silently overwriting it
    // with the default preset (the old repair predates the session boot
    // and became a data-loss path once boot stopped skipping the restore).
    const onSharedPresetError = (error: unknown) => {
      console.error("Failed to load shared preset:", error);
      showSharedPresetErrorToast();
    };

    try {
      const { urlToDocument } =
        await import("@/features/preset/lib/serialization");
      // urlToDocument runs the full decode half of the pipeline: v2
      // payloads decode straight to a document, v1.5 payloads run the same
      // validate -> migrate rung as library presets, and versionless
      // (pre-#269) links are refused with a typed error. Decode before the
      // guard so an invalid link never prompts.
      let document: PresetDocument;
      try {
        document = urlToDocument(presetParam);
      } catch (error) {
        onSharedPresetError(error);
        return;
      }

      // The unsaved-changes guard (decision 6's PR 5 extension): a dirty
      // restored session defers the apply behind the confirm dialog; cancel
      // keeps the restored session.
      requestGuardedPresetLoad("shareLink", () => {
        const applied = loadPresetDocument(() => document, onSharedPresetError);
        if (applied !== null) {
          showSharedPresetToast(applied.meta.name);
        }
      });
    } catch (error) {
      // The serialization module itself failed to load (dynamic import).
      onSharedPresetError(error);
    } finally {
      // Remove URL parameters after loading preset (whether the load was
      // applied, deferred behind the dialog, or refused)
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      url.searchParams.delete("n");
      window.history.replaceState({}, "", url.toString());
    }
  }, [showSharedPresetErrorToast, showSharedPresetToast]);

  // Load initial preset on mount
  useEffect(() => {
    void loadFromUrlOrDefault();
  }, [loadFromUrlOrDefault]);

  return {
    loadPresetFile: loadFile,
    loadPresetDocument: loadDocument,
    importPresetFileText: importFileText,
  };
}

export {
  usePresetLoading,
  importPresetFileText,
  loadPresetDocument,
  loadPresetFile,
  loadPresetFileText,
  loadStoredPresetDocument,
};
export type { UsePresetLoadingResult };
