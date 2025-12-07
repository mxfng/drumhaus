import React from "react";

import { AccentEditScreen } from "@/features/groove/components/AccentEditScreen";
import { FlamEditScreen } from "@/features/groove/components/FlamEditScreen";
import { RatchetEditScreen } from "@/features/groove/components/RatchetEditScreen";
import { PresetControl } from "@/features/preset/components/PresetControl";
import { ChainEditScreen } from "@/features/sequencer/components/ChainEditScreen";
import { ClipboardScreen } from "@/features/sequencer/components/ClipboardScreen";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { TempoControlsScreen } from "@/features/transport/components/TempoControlsScreen";
import FrequencyAnalyzer from "@/shared/components/FrequencyAnalyzer";
import { LogoSweep } from "@/shared/components/LogoSweep";
import { ScreenFlashOverlay } from "@/shared/components/ScreenFlashOverlay";

/*
TODO: Add remaining features

- Dynamic screen right column changes based on current mode (pattern, groove, etc.)
 */
export const Screen: React.FC = () => {
  const mode = usePatternStore((state) => state.mode);

  // Determine which screen to show based on mode
  let rightColumn: React.ReactNode;

  if (mode.type === "variationChain") {
    rightColumn = <ChainEditScreen />;
  } else if (mode.type === "copy" || mode.type === "paste") {
    rightColumn = <ClipboardScreen />;
  } else if (mode.type === "accent") {
    rightColumn = <AccentEditScreen />;
  } else if (mode.type === "flam") {
    rightColumn = <FlamEditScreen />;
  } else if (mode.type === "ratchet") {
    rightColumn = <RatchetEditScreen />;
  } else {
    // Default: frequency analyzer and tempo controls
    rightColumn = (
      <div className="flex h-full flex-col">
        <div className="border-foreground relative min-h-0 flex-1">
          <div className="absolute inset-0 pl-4">
            <FrequencyAnalyzer />
          </div>
          <div className="absolute inset-0">
            <LogoSweep />
          </div>
        </div>
        <TempoControlsScreen />
      </div>
    );
  }

  return (
    <>
      {/* Screen Display */}
      <div className="bg-screen text-foreground outline-border relative col-span-4 h-12 overflow-hidden rounded-2xl outline">
        <div className="grid h-full w-full grid-cols-2 rounded-2xl">
          {/* Left Column - Equal heights */}
          <div className="flex h-full flex-col">
            <PresetControl />
          </div>

          {/* Right Column - Dynamic based on mode */}
          <ScreenFlashOverlay>{rightColumn}</ScreenFlashOverlay>
        </div>
      </div>
    </>
  );
};
