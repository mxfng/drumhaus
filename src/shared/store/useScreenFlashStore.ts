import type React from "react";
import { create } from "zustand";

export type ScreenFlashTone =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral";
export type ScreenFlashIcon = "check" | "info" | "warning" | "alert" | "paste";

export type ScreenFlashPayload = {
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

export const useScreenFlashStore = create<ScreenFlashState>((set) => ({
  flash: null,
  triggerFlash: (payload) =>
    set((state) => ({
      flash: {
        id: (state.flash?.id ?? 0) + 1,
        payload,
      },
    })),
}));

export function triggerScreenFlash(payload: ScreenFlashPayload): void {
  useScreenFlashStore.getState().triggerFlash(payload);
}
