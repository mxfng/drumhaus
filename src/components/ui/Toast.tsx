import { createContext, useCallback, useContext, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

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
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}

/* Toast Provider */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const toast = useCallback((options: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...options }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}

        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            duration={t.duration ?? 5000}
            onOpenChange={(open) => {
              if (!open) removeToast(t.id);
            }}
            className={`
              rounded-lg p-4 shadow-neu
              bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))]
              data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full
              data-[state=closed]:animate-out data-[state=closed]:fade-out-80
              data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full
              ${t.status === "error" ? "border-l-4 border-l-track-red" : ""}
              ${t.status === "success" ? "border-l-4 border-l-track-green" : ""}
            `}
          >
            {t.title && (
              <ToastPrimitive.Title className="font-pixel text-sm font-medium text-text-dark">
                {t.title}
              </ToastPrimitive.Title>
            )}
            {t.description && (
              <ToastPrimitive.Description className="font-pixel text-xs text-text mt-1">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-[100] flex max-w-[420px] flex-col gap-2" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
