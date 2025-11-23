import { useMemo } from "react";
import { LuArrowUpRight } from "react-icons/lu";
import { getContext } from "tone";

import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { useDebugStore } from "@/stores/useDebugStore";
import { DrumhausLogo } from "../icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "../icon/DrumhausTypographyLogo";

interface AboutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Firefox")) return "Firefox";
  if (ua.includes("Edg")) return "Edge";
  if (ua.includes("Chrome")) return "Chrome";
  if (ua.includes("Safari")) return "Safari";
  return "Unknown";
};

const getAudioContextInfo = () => {
  const ctx = getContext();

  return {
    sampleRate: ctx.sampleRate,
    // can always add more later
  };
};

export const AboutDialog: React.FC<AboutDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const browser = useMemo(() => getBrowserInfo(), []);
  const audioInfo = useMemo(() => getAudioContextInfo(), []);
  const currentYear = new Date().getFullYear();
  const debugMode = useDebugStore((state) => state.debugMode);
  const toggleDebugMode = useDebugStore((state) => state.toggleDebugMode);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent variant="primary">
        <DialogHeader>
          <DialogTitle className="hidden">About</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="mb-8 flex flex-col items-start gap-2">
          <div className="flex items-baseline gap-2">
            <DrumhausLogo size={32} color="white" />
            <DrumhausTypographyLogo color="white" size={280} />
          </div>
          <p className="text-center text-sm">
            Browser Controlled Rhythmic Groove Machine
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <p className="font-semibold">Build</p>
            <div className="font-pixel flex flex-col gap-1">
              <p>Version {__APP_VERSION__}</p>
              <p>{new Date(__BUILD_TIME__).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex gap-4">
              <p className="font-semibold">Runtime</p>
              <div className="flex text-xs">
                <button
                  onClick={toggleDebugMode}
                  className={cn("cursor-pointer transition-opacity", {
                    "opacity-80": debugMode,
                    "opacity-40 hover:opacity-60": !debugMode,
                  })}
                >
                  {debugMode ? "● Debug Mode" : "○ Debug Mode"}
                </button>
              </div>
            </div>
            <div className="font-pixel flex flex-col gap-1">
              <p>{browser}</p>
              <p>Node {__NODE_VERSION__}</p>
              <p>{audioInfo.sampleRate} Hz</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex flex-col gap-1">
            <a
              href="https://fung.studio/"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 transition-colors hover:text-white"
            >
              fung.studio <LuArrowUpRight className="inline-block" />
            </a>
            <a
              href="https://ko-fi.com/maxfung"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 transition-colors hover:text-white"
            >
              Support on Ko-fi <LuArrowUpRight className="inline-block" />
            </a>
            <a
              href="https://github.com/mxfng/drumhaus"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-0.5 transition-colors hover:text-white"
            >
              GitHub <LuArrowUpRight className="inline-block" />
            </a>
          </div>
          <div className="flex flex-col justify-end">
            <p className="text-xs">© 2023-{currentYear} Max Fung</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
