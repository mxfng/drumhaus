import { createContext, useContext } from "react";

/* Toast Types */
export type ToastStatus = "success" | "error" | "info";

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  status?: ToastStatus;
  duration?: number;
}

export interface ToastContextValue {
  toast: (options: Omit<ToastData, "id">) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/* Hook to use toast */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
