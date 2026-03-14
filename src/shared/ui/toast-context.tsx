import { createContext, useContext } from "react";

/* Toast Types */
type ToastStatus = "success" | "error" | "info";

interface ToastData {
  id: string;
  title?: string;
  description?: string;
  status?: ToastStatus;
  duration?: number;
}

interface ToastContextValue {
  toast: (options: Omit<ToastData, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/* Hook to use toast */
function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

export { ToastContext, useToast };
export type { ToastStatus, ToastData, ToastContextValue };
