import React, { useState } from "react";

import { useDebugStore } from "@/features/debug/store/useDebugStore";
import { AboutDialog } from "@/shared/dialogs/AboutDialog";
import { DrumhausLogo } from "@/shared/icon/DrumhausLogo";
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

const SCALE_OPTIONS = [
  { value: 50, label: "50%" },
  { value: 60, label: "60%" },
  { value: 70, label: "70%" },
  { value: 80, label: "80%" },
  { value: 90, label: "90%" },
  { value: 100, label: "100%" },
  { value: 120, label: "120%" },
  { value: 140, label: "140%" },
  { value: 160, label: "160%" },
  { value: 180, label: "180%" },
  { value: 200, label: "200%" },
];

export const FloatingMenu: React.FC = () => {
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  const debugMode = useDebugStore((state) => state.debugMode);
  const toggleDebugMode = useDebugStore((state) => state.toggleDebugMode);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const togglePotatoMode = usePerformanceStore(
    (state) => state.togglePotatoMode,
  );

  const handleScaleSelect = (scale: number) => {
    // TODO: Implement layout scaling
    console.log("Scale selected:", scale);
  };

  const handleFitToScreen = () => {
    // TODO: Implement fit to screen
    console.log("Fit to screen");
  };

  const handleZoomOut = () => {
    // TODO: Implement zoom out
    console.log("Zoom out");
  };

  const handleZoomIn = () => {
    // TODO: Implement zoom in
    console.log("Zoom in");
  };

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
              <DropdownMenuItem onSelect={handleFitToScreen}>
                Fit to Screen
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleZoomOut}>
                Zoom Out
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleZoomIn}>
                Zoom In
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {SCALE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => handleScaleSelect(option.value)}
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
