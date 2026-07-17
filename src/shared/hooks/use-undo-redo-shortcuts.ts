import { useEffect } from "react";

import { redo, undo } from "@/features/preset/history/history";
import { isTextInputFocused } from "@/shared/lib/is-text-input-focused";
import { useDialogStore } from "@/shared/store/use-dialog-store";

/**
 * Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z redoes. Text inputs keep the
 * browser's native field undo, and dialogs (forms mid-edit) are left alone,
 * mirroring the spacebar play toggle's guards.
 */
function useUndoRedoShortcuts(): void {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() !== "z") return;

      if (isTextInputFocused()) return;

      e.preventDefault();

      if (isAnyDialogOpen()) return;

      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [isAnyDialogOpen]);
}

export { useUndoRedoShortcuts };
