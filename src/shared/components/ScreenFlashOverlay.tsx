import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Info,
} from "lucide-react";

import {
  ScreenFlashPayload,
  useScreenFlashStore,
} from "@/shared/store/useScreenFlashStore";

const iconMap = {
  check: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  alert: AlertTriangle,
  paste: ClipboardCheck,
} as const;

type ScreenFlashOverlayProps = {
  children: React.ReactNode;
};

export const ScreenFlashOverlay: React.FC<ScreenFlashOverlayProps> = ({
  children,
}) => {
  const flash = useScreenFlashStore((state) => state.flash);
  const [active, setActive] = React.useState<{
    id: number;
    payload: ScreenFlashPayload;
  } | null>(null);

  React.useEffect(() => {
    if (!flash) return;
    setActive(flash);
    const duration = flash.payload.durationMs ?? 900;
    const timeout = window.setTimeout(() => setActive(null), duration);
    return () => window.clearTimeout(timeout);
  }, [flash]);

  const Icon = active?.payload.icon
    ? (iconMap[active.payload.icon] ?? CheckCircle2)
    : null;

  return (
    <div className="relative h-full w-full">
      <AnimatePresence>
        {active && (
          <motion.div
            key={active.id}
            className="bg-screen text-screen-foreground pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <motion.div
              className="flex flex-col items-center px-6 text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: { duration: 0.18, ease: [0.3, 0.8, 0.4, 1] },
              }}
              exit={{
                opacity: 0,
                y: -6,
                transition: { duration: 0.16, ease: [0.4, 0, 1, 1] },
              }}
            >
              <div className="flex items-center gap-2 text-base tracking-wide lowercase">
                {Icon ? <Icon size={18} /> : <CheckCircle2 size={18} />}
                <span>{active.payload.message}</span>
              </div>
              {active.payload.subtext && (
                <span className="text-foreground-muted -mt-1 text-sm lowercase">
                  {active.payload.subtext}
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
};
