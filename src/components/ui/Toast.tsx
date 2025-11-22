import { useCallback, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

import { ToastContext, type ToastData } from "./ToastContext";

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
            className={`shadow-neu data-[state=open]:animate-in data-[state=open]:slide-in-from-top-full data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full rounded-lg bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))] p-4 ${t.status === "error" ? "border-l-track-red border-l-4" : ""} ${t.status === "success" ? "border-l-track-green border-l-4" : ""} `}
          >
            {t.title && (
              <ToastPrimitive.Title className="font-pixel text-text-dark text-sm font-medium">
                {t.title}
              </ToastPrimitive.Title>
            )}
            {t.description && (
              <ToastPrimitive.Description className="font-pixel text-text mt-1 text-xs">
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
