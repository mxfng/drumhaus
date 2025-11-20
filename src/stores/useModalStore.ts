import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

interface ModalState {
  // Modal visibility states
  isSaveModalOpen: boolean;
  isSharingModalOpen: boolean;
  isSharedModalOpen: boolean;
  isResetModalOpen: boolean;
  isPresetChangeModalOpen: boolean;
  isSharePromptOpen: boolean;

  // Modal data
  shareableLink: string;
  presetToChange: string;

  // Actions
  openSaveModal: () => void;
  closeSaveModal: () => void;

  openSharingModal: () => void;
  closeSharingModal: () => void;

  openSharedModal: (link: string) => void;
  closeSharedModal: () => void;

  openResetModal: () => void;
  closeResetModal: () => void;

  openPresetChangeModal: (presetName: string) => void;
  closePresetChangeModal: () => void;

  openSharePrompt: () => void;
  closeSharePrompt: () => void;

  // Helper to check if any modal is open (for blocking spacebar)
  isAnyModalOpen: () => boolean;

  // Reset all modals
  closeAllModals: () => void;
}

export const useModalStore = create<ModalState>()(
  devtools(
    immer((set, get) => ({
      // Initial state
      isSaveModalOpen: false,
      isSharingModalOpen: false,
      isSharedModalOpen: false,
      isResetModalOpen: false,
      isPresetChangeModalOpen: false,
      isSharePromptOpen: false,
      shareableLink: "",
      presetToChange: "",

      // Actions
      openSaveModal: () => {
        set((state) => {
          state.isSaveModalOpen = true;
        });
      },

      closeSaveModal: () => {
        set((state) => {
          state.isSaveModalOpen = false;
        });
      },

      openSharingModal: () => {
        set((state) => {
          state.isSharingModalOpen = true;
        });
      },

      closeSharingModal: () => {
        set((state) => {
          state.isSharingModalOpen = false;
        });
      },

      openSharedModal: (link: string) => {
        set((state) => {
          state.isSharedModalOpen = true;
          state.shareableLink = link;
        });
      },

      closeSharedModal: () => {
        set((state) => {
          state.isSharedModalOpen = false;
        });
      },

      openResetModal: () => {
        set((state) => {
          state.isResetModalOpen = true;
        });
      },

      closeResetModal: () => {
        set((state) => {
          state.isResetModalOpen = false;
        });
      },

      openPresetChangeModal: (presetName: string) => {
        set((state) => {
          state.isPresetChangeModalOpen = true;
          state.presetToChange = presetName;
        });
      },

      closePresetChangeModal: () => {
        set((state) => {
          state.isPresetChangeModalOpen = false;
          state.presetToChange = "";
        });
      },

      openSharePrompt: () => {
        set((state) => {
          state.isSharePromptOpen = true;
        });
      },

      closeSharePrompt: () => {
        set((state) => {
          state.isSharePromptOpen = false;
        });
      },

      isAnyModalOpen: () => {
        const state = get();
        return (
          state.isSaveModalOpen ||
          state.isSharingModalOpen ||
          state.isSharedModalOpen ||
          state.isResetModalOpen ||
          state.isPresetChangeModalOpen ||
          state.isSharePromptOpen
        );
      },

      closeAllModals: () => {
        set((state) => {
          state.isSaveModalOpen = false;
          state.isSharingModalOpen = false;
          state.isSharedModalOpen = false;
          state.isResetModalOpen = false;
          state.isPresetChangeModalOpen = false;
          state.isSharePromptOpen = false;
          state.shareableLink = "";
          state.presetToChange = "";
        });
      },
    })),
    {
      name: "ModalStore",
    },
  ),
);
