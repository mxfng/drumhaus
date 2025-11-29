import { Pause, Play } from "lucide-react";

import { Button, Tooltip } from "@/components/ui";
import { useKeyboardShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useLayoutScale } from "@/hooks/ui/useLayoutScale";
import { useMobileWarning } from "@/hooks/useMobileWarning";
import { useDrumhaus } from "@/providers/DrumhausProvider";
import { useDialogStore } from "@/stores/useDialogStore";
import { useTransportStore } from "@/stores/useTransportStore";
import { DebugOverlay } from "./common/DebugOverlay";
import FrequencyAnalyzer from "./common/FrequencyAnalyzer";
import { MasterCompressor } from "./controls/master/MasterCompressor";
import { MasterFX } from "./controls/master/MasterFX";
import { MasterVolume } from "./controls/master/MasterVolume";
import { PresetControl } from "./controls/PresetControl";
import { SequencerControl } from "./controls/SequencerControl";
import { TransportControl } from "./controls/TransportControl";
import { MobileDialog } from "./dialog/MobileDialog";
import { DrumhausLogo } from "./icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "./icon/DrumhausTypographyLogo";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { InstrumentGrid } from "./instrument/InstrumentGrid";
import { Sequencer } from "./sequencer/Sequencer";

const Drumhaus = () => {
  // --- Context ---
  const { instrumentRuntimes, instrumentRuntimesVersion } = useDrumhaus();

  // --- Store State ---
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const openDialog = useDialogStore((state) => state.openDialog);

  // --- Desktop-specific Hooks ---
  const { scale } = useLayoutScale();
  useMobileWarning();
  useKeyboardShortcuts({
    instrumentRuntimes,
    instrumentRuntimesVersion,
  });

  return (
    <>
      <div className="drumhaus-root">
        <div
          className="drumhaus-scale-wrapper"
          style={{ "--scale": scale } as React.CSSProperties}
        >
          <div className="animate-fade-in">
            <div className="hidden h-[50px] lg:block" />
            <div className="neu-extra-tall bg-surface relative h-[1000px] w-[1538px] overflow-clip rounded-xl">
              {/* Header */}
              <div className="surface mb-2 grid h-[120px] grid-cols-8 shadow-[0_4px_8px_var(--color-shadow-60)]">
                <div className="col-span-5 flex h-[120px] flex-row items-end pb-4 pl-8">
                  <button
                    className="flex cursor-pointer items-end"
                    onClick={() => openDialog("about")}
                  >
                    <div className="text-primary flex items-end">
                      <DrumhausLogo size={46} color="currentColor" />
                    </div>
                    <div className="ml-2 flex items-end">
                      <DrumhausTypographyLogo color="#ff7b00" size={420} />
                    </div>
                    <div className="-mb-1 ml-4 text-left">
                      <p className="opacity-70">Browser Controlled</p>
                      <p className="opacity-70">Rhythmic Groove Machine</p>
                    </div>
                  </button>
                </div>

                <div className="col-span-3 m-4 overflow-hidden rounded-2xl opacity-60 shadow-[0_2px_8px_var(--color-shadow-60)_inset]">
                  <FrequencyAnalyzer />
                </div>
              </div>

              {/* Instrument Grid */}
              <div className="shadow-[0_4px_8px_var(--color-shadow-60)]">
                <InstrumentGrid key={instrumentRuntimesVersion} />
              </div>

              {/* Main Controls */}
              <div className="grid h-60 w-full grid-cols-8 flex-row items-center">
                {/* Play/Pause Button */}
                <div className="flex items-center justify-center">
                  <Tooltip
                    content={isPlaying ? "Pause [Space]" : "Play [Space]"}
                  >
                    <Button
                      variant="hardware"
                      size="lg"
                      className="neu-medium-raised h-[140px] w-[140px] rounded-lg shadow-[var(--shadow-neu-md),0_0_2px_3px_var(--color-shadow-30)]"
                      onClick={() => togglePlay(instrumentRuntimes.current)}
                      onKeyDown={(ev) => ev.preventDefault()}
                    >
                      {isPlaying ? (
                        <Pause fill="currentColor" size={50} strokeWidth={1} />
                      ) : (
                        <Play fill="currentColor" size={50} strokeWidth={1} />
                      )}
                    </Button>
                  </Tooltip>
                </div>

                {/* Sequencer & Transport Controls */}
                <div className="col-span-2 flex flex-row">
                  <SequencerControl />
                  <TransportControl />
                </div>

                {/* Preset Control */}
                <div className="col-span-2 flex h-full flex-row py-3">
                  <PresetControl />
                </div>

                {/* Master Controls */}
                <MasterCompressor />
                <MasterFX />
                <MasterVolume />
              </div>

              {/* Sequencer */}
              <div className="p-8 shadow-[0_4px_8px_var(--color-shadow-60)]">
                <Sequencer />
              </div>

              {/* Branding Link */}
              <a
                className="absolute right-2.5 bottom-2.5 opacity-20"
                href="https://fung.studio/"
                target="_blank"
                rel="noreferrer"
              >
                <FungPeaceLogo color="#B09374" size={70} />
              </a>
            </div>

            {/* Footer */}
            <div className="relative h-[50px] w-full">
              <div className="flex h-full w-full items-center justify-center">
                <div className="text-foreground flex">
                  <p className="text-sm">Designed with love by</p>
                  <a
                    href="https://fung.studio/"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-sm"
                  >
                    Max Fung.
                  </a>
                  <a
                    href="https://ko-fi.com/maxfung"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 text-sm text-gray-500"
                  >
                    Support on ko-fi.
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <MobileDialog isOpen={activeDialog === "mobile"} onClose={closeDialog} />
      <DebugOverlay />
    </>
  );
};

export default Drumhaus;
