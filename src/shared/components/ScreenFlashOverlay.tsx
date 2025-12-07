import { useEffect, useState } from "react";
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
  const [active, setActive] = useState<{
    id: number;
    payload: ScreenFlashPayload;
  } | null>(null);

  useEffect(() => {
    if (!flash) return;
    setActive(flash);

    const duration = flash.payload.durationMs ?? 900;
    const removeTimer = window.setTimeout(() => setActive(null), duration);

    return () => {
      window.clearTimeout(removeTimer);
    };
  }, [flash]);

  const Icon = active?.payload.icon
    ? (iconMap[active.payload.icon] ?? CheckCircle2)
    : null;

  return (
    <div className="relative h-full w-full">
      {active && (
        <div
          key={active.id}
          className="bg-screen text-screen-foreground pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          <div className="animate-in slide-in-from-bottom flex flex-row items-center gap-3">
            {Icon ? <Icon size={28} /> : <CheckCircle2 size={28} />}
            <div className="flex h-full flex-col">
              <div className="text-base lowercase">
                {active.payload.message}
              </div>
              {active.payload.subtext && (
                <div className="text-foreground-muted -mt-1.5 text-sm">
                  {active.payload.subtext}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {children}
    </div>
  );
};
