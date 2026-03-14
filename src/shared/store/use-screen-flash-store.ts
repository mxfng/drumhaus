import type React from "react";
import { create } from "zustand";

type ScreenFlashTone = "success" | "info" | "warning" | "danger" | "neutral";
type ScreenFlashIcon =
  | "check"
  | "info"
  | "warning"
  | "alert"
  | "paste"
  | "eraser";

type ScreenFlashPayload = {
  message: React.ReactNode;
  subtext?: React.ReactNode;
  tone?: ScreenFlashTone;
  icon?: ScreenFlashIcon;
  durationMs?: number;
};

type ScreenFlashState = {
  flash: { id: number; payload: ScreenFlashPayload } | null;
  triggerFlash: (payload: ScreenFlashPayload) => void;
};

const useScreenFlashStore = create<ScreenFlashState>((set) => ({
  flash: null,
  triggerFlash: (payload) =>
    set((state) => ({
      flash: {
        id: (state.flash?.id ?? 0) + 1,
        payload,
      },
    })),
}));

function triggerScreenFlash(payload: ScreenFlashPayload): void {
  useScreenFlashStore.getState().triggerFlash(payload);
}

export { useScreenFlashStore, triggerScreenFlash };
export type { ScreenFlashTone, ScreenFlashIcon, ScreenFlashPayload };
