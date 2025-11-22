import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface DialogState {
  // Dialog visibility states
  isSaveDialogOpen: boolean;
  isSharingDialogOpen: boolean;
  isSharedDialogOpen: boolean;
  isResetDialogOpen: boolean;
  isPresetChangeDialogOpen: boolean;

  // Dialog data
  shareableLink: string;
  presetToChange: string;

  // Actions
  openSaveDialog: () => void;
  closeSaveDialog: () => void;

  openSharingDialog: () => void;
  closeSharingDialog: () => void;

  openSharedDialog: (link: string) => void;
  closeSharedDialog: () => void;

  openResetDialog: () => void;
  closeResetDialog: () => void;

  openPresetChangeDialog: (presetName: string) => void;
  closePresetChangeDialog: () => void;

  // Helper to check if any dialog is open (for blocking spacebar)
  isAnyDialogOpen: () => boolean;

  // Reset all dialogs
  closeAllDialogs: () => void;
}

export const useDialogStore = create<DialogState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      isSaveDialogOpen: false,
      isSharingDialogOpen: false,
      isSharedDialogOpen: false,
      isResetDialogOpen: false,
      isPresetChangeDialogOpen: false,
      shareableLink: "",
      presetToChange: "",

      // Actions
      openSaveDialog: () => {
        set((state) => {
          state.isSaveDialogOpen = true;
        });
      },

      closeSaveDialog: () => {
        set((state) => {
          state.isSaveDialogOpen = false;
        });
      },

      openSharingDialog: () => {
        set((state) => {
          state.isSharingDialogOpen = true;
        });
      },

      closeSharingDialog: () => {
        set((state) => {
          state.isSharingDialogOpen = false;
        });
      },

      openSharedDialog: (link: string) => {
        set((state) => {
          state.isSharedDialogOpen = true;
          state.shareableLink = link;
        });
      },

      closeSharedDialog: () => {
        set((state) => {
          state.isSharedDialogOpen = false;
        });
      },

      openResetDialog: () => {
        set((state) => {
          state.isResetDialogOpen = true;
        });
      },

      closeResetDialog: () => {
        set((state) => {
          state.isResetDialogOpen = false;
        });
      },

      openPresetChangeDialog: (presetName: string) => {
        set((state) => {
          state.isPresetChangeDialogOpen = true;
          state.presetToChange = presetName;
        });
      },

      closePresetChangeDialog: () => {
        set((state) => {
          state.isPresetChangeDialogOpen = false;
          state.presetToChange = "";
        });
      },

      isAnyDialogOpen: () => {
        const state = get();
        return (
          state.isSaveDialogOpen ||
          state.isSharingDialogOpen ||
          state.isSharedDialogOpen ||
          state.isResetDialogOpen ||
          state.isPresetChangeDialogOpen
        );
      },

      closeAllDialogs: () => {
        set((state) => {
          state.isSaveDialogOpen = false;
          state.isSharingDialogOpen = false;
          state.isSharedDialogOpen = false;
          state.isResetDialogOpen = false;
          state.isPresetChangeDialogOpen = false;
          state.shareableLink = "";
          state.presetToChange = "";
        });
      },
    })),
    {
      name: "DialogStore",
    },
  ),
);
