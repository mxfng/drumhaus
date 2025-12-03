import React, { useState } from "react";

import { useDebugStore } from "@/features/debug/store/useDebugStore";
import { AboutDialog } from "@/shared/dialogs/AboutDialog";
import { DrumhausLogo } from "@/shared/icon/DrumhausLogo";
import {
  SCALE_OPTIONS,
  useLayoutScaleStore,
} from "@/shared/store/useLayoutScaleStore";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui";

const SCALE_MENU_OPTIONS = SCALE_OPTIONS.map((value) => ({
  value,
  label: `${value}%`,
}));

export const FloatingMenu: React.FC = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const debugMode = useDebugStore((state) => state.debugMode);
  const toggleDebugMode = useDebugStore((state) => state.toggleDebugMode);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const togglePotatoMode = usePerformanceStore(
    (state) => state.togglePotatoMode,
  );

  const setScale = useLayoutScaleStore((state) => state.setScale);
  const fitToScreen = useLayoutScaleStore((state) => state.fitToScreen);
  const zoomIn = useLayoutScaleStore((state) => state.zoomIn);
  const zoomOut = useLayoutScaleStore((state) => state.zoomOut);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-primary border-primary hover:bg-primary-muted/20 fixed top-2 left-2 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 bg-transparent opacity-60 backdrop-blur-xl transition-all duration-500 hover:opacity-100 focus:ring-0 focus:outline-none">
            <DrumhausLogo size={20} fill="currentColor" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="right">
          <DropdownMenuItem onSelect={() => setIsAboutOpen(true)}>
            About Drumhaus
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              window.open(
                "https://github.com/mxfng/drumhaus/issues",
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            Report an Issue
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={debugMode}
            onCheckedChange={toggleDebugMode}
          >
            Debug Mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={potatoMode}
            onCheckedChange={togglePotatoMode}
          >
            Potato Mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>Resize App</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onSelect={fitToScreen}>
                Fit to Screen
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={zoomOut}>Zoom Out</DropdownMenuItem>
              <DropdownMenuItem onSelect={zoomIn}>Zoom In</DropdownMenuItem>
              <DropdownMenuSeparator />
              {SCALE_MENU_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => setScale(option.value)}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};
