import { AccentEditScreen } from "@/features/groove/components/accent-edit-screen";
import { FlamEditScreen } from "@/features/groove/components/flam-edit-screen";
import { RatchetEditScreen } from "@/features/groove/components/ratchet-edit-screen";
import { PresetControl } from "@/features/preset/components/preset-control";
import { ChainEditScreen } from "@/features/sequencer/components/chain-edit-screen";
import { ClearScreen } from "@/features/sequencer/components/clear-screen";
import { ClipboardScreen } from "@/features/sequencer/components/clipboard-screen";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { TempoControlsScreen } from "@/features/transport/components/tempo-controls-screen";
import FrequencyAnalyzer from "@/shared/components/frequency-analyzer";
import { LogoSweep } from "@/shared/components/logo-sweep";
import { ScreenFlashOverlay } from "@/shared/components/screen-flash-overlay";

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
  } else if (mode.type === "clear") {
    rightColumn = <ClearScreen />;
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
