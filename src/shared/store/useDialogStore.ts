import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// Add new dialog names here as needed
export type DialogName =
  | "save"
  | "export"
  | "presetChange"
  | "mobile"
  | "about"
  | "share"
  | "renamePreset"
  | "deletePresetConfirm"
  | "duplicatePreset";

interface DialogData {
  preset?: {
    id: string;
    name?: string;
  };
}

type DialogStoreType = {
  activeDialog: DialogName | null;
  dialogData: DialogData;
  openDialog: (name: DialogName, data?: Partial<DialogData>) => void;
  closeDialog: () => void;
  isAnyDialogOpen: () => boolean;
};

export const useDialogStore = create<DialogStoreType>()(
  devtools(
    immer((set, get) => ({
      activeDialog: null,
      dialogData: {
        preset: undefined,
      },
      openDialog: (name, data) => {
        set((state) => {
          state.activeDialog = name;
          if (data) {
            state.dialogData = { ...state.dialogData, ...data };
          }
        });
      },
      closeDialog: () => {
        set((state) => {
          const current = state.activeDialog;
          state.activeDialog = null;
          // Clear associated data when closing specific dialogs
          if (current === "presetChange") {
            state.dialogData.preset = undefined;
          }
        });
      },
      isAnyDialogOpen: () => {
        return get().activeDialog !== null;
      },
    })),
    {
      name: "DialogStore",
    },
  ),
);
