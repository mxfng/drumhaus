import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// Add new dialog names here as needed
export type DialogName =
  | "save"
  | "share"
  | "reset"
  | "presetChange"
  | "mobile"
  | "about";

interface DialogData {
  presetToChange: string;
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
        presetToChange: "",
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
            state.dialogData.presetToChange = "";
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
