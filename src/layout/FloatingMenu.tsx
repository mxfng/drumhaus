import React, { useState } from "react";

import { useDebugStore } from "@/features/debug/store/useDebugStore";
import { useNightModeStore } from "@/features/night/store/useNightModeStore";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  const nightMode = useNightModeStore((state) => state.nightMode);
  const toggleNightMode = useNightModeStore((state) => state.toggleNightMode);

  const scale = useLayoutScaleStore((state) => state.scale);
  const setScale = useLayoutScaleStore((state) => state.setScale);
  const fitToScreen = useLayoutScaleStore((state) => state.fitToScreen);
  const zoomIn = useLayoutScaleStore((state) => state.zoomIn);
  const zoomOut = useLayoutScaleStore((state) => state.zoomOut);

  const isAtMinScale = scale <= SCALE_OPTIONS[0];
  const isAtMaxScale = scale >= SCALE_OPTIONS[SCALE_OPTIONS.length - 1];

  const handleTogglePotatoMode = () => {
    if (nightMode) {
      toggleNightMode();
    }

    if (debugMode) {
      toggleDebugMode();
    }

    togglePotatoMode();
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="text-primary border-primary hover:bg-accent/20 focus-ring fixed top-2 left-2 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 bg-transparent opacity-80 backdrop-blur-xl transition-all duration-500 hover:opacity-100">
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
                "https://ko-fi.com/maxfung",
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            Donate
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
            checked={nightMode}
            onCheckedChange={toggleNightMode}
            disabled={potatoMode}
          >
            Night Mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={debugMode}
            onCheckedChange={toggleDebugMode}
            disabled={potatoMode}
          >
            Debug Mode
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={potatoMode}
            onCheckedChange={handleTogglePotatoMode}
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
              <DropdownMenuItem onSelect={zoomOut} disabled={isAtMinScale}>
                Zoom Out
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={zoomIn} disabled={isAtMaxScale}>
                Zoom In
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup
                value={scale.toString()}
                onValueChange={(value) => setScale(parseInt(value))}
              >
                {SCALE_MENU_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem
                    key={option.value}
                    value={option.value.toString()}
                  >
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>

      <AboutDialog isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </>
  );
};
