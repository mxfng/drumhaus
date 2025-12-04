import { useCallback, useState } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";

import "@/app/styles/toast.css";

import { ToastContext, type ToastData } from "./ToastContext";

interface ToastState extends ToastData {
  open: boolean;
}

/* Toast Provider */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  const toast = useCallback((options: Omit<ToastData, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, open: true, ...options }]);
  }, []);

  const closeToast = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, open: false } : t)),
    );
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
            open={t.open}
            duration={t.duration ?? 5000}
            onOpenChange={(open) => {
              if (!open) closeToast(t.id);
            }}
            onAnimationEnd={(e) => {
              if (e.animationName === "exit" && !t.open) {
                removeToast(t.id);
              }
            }}
            className={`toast-root shadow-neu data-[state=open]:animate-in data-[state=open]:slide-in-from-top data-[state=closed]:animate-out data-[state=closed]:fade-out bg-primary text-primary-foreground rounded-tr-md rounded-bl-md p-4 ${t.status === "error" ? "border-l-track-red border-l-4" : ""} ${t.status === "success" ? "border-l-track-green border-l-4" : ""} `}
          >
            {t.title && (
              <ToastPrimitive.Title className="text-primary-foreground text-sm font-medium">
                {t.title}
              </ToastPrimitive.Title>
            )}
            {t.description && (
              <ToastPrimitive.Description className="font-pixel text-primary-foreground/90 mt-1 text-xs">
                {t.description}
              </ToastPrimitive.Description>
            )}
          </ToastPrimitive.Root>
        ))}

        <ToastPrimitive.Viewport className="fixed top-4 right-4 z-100 flex max-w-[420px] flex-col gap-2" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
