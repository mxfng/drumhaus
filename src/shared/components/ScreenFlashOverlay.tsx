import { useEffect, useEffectEvent, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Eraser,
  Info,
  LucideIcon,
} from "lucide-react";

import {
  ScreenFlashIcon,
  ScreenFlashPayload,
  useScreenFlashStore,
} from "@/shared/store/useScreenFlashStore";

const DEFAULT_DURATION_MS = 1500;

const iconMap: Record<ScreenFlashIcon, LucideIcon> = {
  check: CheckCircle2,
  info: Info,
  warning: AlertTriangle,
  alert: AlertTriangle,
  paste: ClipboardCheck,
  eraser: Eraser,
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

  const updateActive = useEffectEvent(
    (nextActive: { id: number; payload: ScreenFlashPayload } | null) => {
      setActive(nextActive);
    },
  );

  useEffect(() => {
    if (!flash) return;
    updateActive(flash);

    const duration = flash.payload.durationMs ?? DEFAULT_DURATION_MS;
    const removeTimer = window.setTimeout(() => updateActive(null), duration);

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
