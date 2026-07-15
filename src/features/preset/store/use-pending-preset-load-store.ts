import { create } from "zustand";
import { devtools } from "zustand/middleware";

import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { useDialogStore } from "@/shared/store/use-dialog-store";

/**
 * The pending-load slot behind the unsaved-changes guard
 * (docs/preset-persistence.md, PR 5: "extend unsaved-changes checks to file
 * import and share-link loads", decision 6).
 *
 * One mechanism serves every guarded ingress (library switch, file import,
 * share link): the caller packages its confirmed load as a closure and calls
 * requestGuardedPresetLoad, which applies it immediately when the session is
 * clean, and otherwise stages it here and opens the shared "presetChange"
 * confirm dialog (confirm-select-preset-dialog.tsx). Confirm runs the staged
 * closure; cancel or dismiss discards it, leaving the session untouched.
 */

/** Which ingress staged the load; selects the confirm dialog's copy. */
type PendingPresetLoadSource = "library" | "file" | "shareLink";

interface PendingPresetLoad {
  source: PendingPresetLoadSource;
  /**
   * The confirmed load: applies the preset through the document pipeline
   * and owns its success/error toasts, exactly as the unguarded path would.
   */
  apply: () => void;
}

interface PendingPresetLoadState {
  pending: PendingPresetLoad | null;
  stage: (load: PendingPresetLoad) => void;
  /** Run and clear the staged load (the dialog's confirm action). */
  confirm: () => void;
  /** Clear the staged load without running it (cancel/dismiss). */
  discard: () => void;
}

const usePendingPresetLoadStore = create<PendingPresetLoadState>()(
  devtools(
    (set, get) => ({
      pending: null,

      stage: (load) => {
        set({ pending: load });
      },

      confirm: () => {
        const { pending } = get();
        // Clear before applying so a throwing apply can never leave a stale
        // pending load behind the (already closed) dialog.
        set({ pending: null });
        pending?.apply();
      },

      discard: () => {
        set({ pending: null });
      },
    }),
    {
      name: "PendingPresetLoadStore",
    },
  ),
);

/**
 * Apply a preset load behind the unsaved-changes guard: clean sessions
 * apply immediately, dirty sessions stage the load and open the confirm
 * dialog.
 *
 * A plain function over getState() so non-React callers (the share-link
 * boot effect) can drive it; the dialog store is plain zustand, so opening
 * "presetChange" before the dialog component mounts simply shows it on
 * mount.
 */
function requestGuardedPresetLoad(
  source: PendingPresetLoadSource,
  apply: () => void,
): void {
  if (!usePresetMetaStore.getState().hasUnsavedChanges()) {
    apply();
    return;
  }

  usePendingPresetLoadStore.getState().stage({ source, apply });
  useDialogStore.getState().openDialog("presetChange");
}

export { requestGuardedPresetLoad, usePendingPresetLoadStore };
export type { PendingPresetLoad, PendingPresetLoadSource };
