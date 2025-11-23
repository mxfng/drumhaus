import { useEffect } from "react";
import { IoPauseSharp, IoPlaySharp } from "react-icons/io5";

import { Button, Tooltip } from "@/components/ui";
import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useMobileWarning } from "@/hooks/useMobileWarning";
import { usePresetLoading } from "@/hooks/usePresetLoading";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useDialogStore } from "@/stores/useDialogStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
import { MasterCompressor } from "./controls/master/MasterCompressor";
import { MasterFX } from "./controls/master/MasterFX";
import { MasterVolume } from "./controls/master/MasterVolume";
import { PresetControl } from "./controls/PresetControl";
import { SequencerControl } from "./controls/SequencerControl";
import { TransportControl } from "./controls/TransportControl";
import { DebugOverlay } from "./DebugOverlay";
import { AboutDialog } from "./dialog/AboutDialog";
import { MobileDialog } from "./dialog/MobileDialog";
import FrequencyAnalyzer from "./FrequencyAnalyzer";
import { DrumhausLogo } from "./icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "./icon/DrumhausTypographyLogo";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { InstrumentGrid } from "./instrument/InstrumentGrid";
import { Sequencer } from "./Sequencer";

const Drumhaus = () => {
  // --- Store State ---

  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  const { scale } = useLayoutScale();

  // --- Service Worker Registration ---

  useServiceWorker();

  // --- Audio Engine and Preset Loading ---

  const { instrumentRuntimes, instrumentRuntimesVersion, isLoading } =
    useAudioEngine();

  const { loadPreset } = usePresetLoading({ instrumentRuntimes });

  // --- Keyboard and Mobile Hooks ---

  useKeyboardShortcuts({
    isLoading,
    instrumentRuntimes,
    instrumentRuntimesVersion,
  });

  useMobileWarning();

  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  // --- Initial Loader Cleanup ---

  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (!loader) return;

    loader.classList.add("initial-loader--hidden");

    const timeout = window.setTimeout(() => {
      loader.remove();
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  // --- Render ---

  return (
    <>
      <div className="drumhaus-root">
        <div
          className="drumhaus-scale-wrapper"
          style={{ "--scale": scale } as React.CSSProperties}
        >
          <div className="animate-fade-in">
            <div className="hidden h-[50px] lg:block"></div>
            <div className="neu-extra-tall bg-surface relative h-[1000px] w-[1538px] overflow-clip rounded-xl">
              <TopBar />

              <MainControls
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                instrumentRuntimes={instrumentRuntimes.current}
                instrumentRuntimesVersion={instrumentRuntimesVersion}
                loadPreset={loadPreset}
              />

              <SequencerSection />

              <BrandingLink />
            </div>
            <div className="relative h-[50px] w-full">
              <Footer />
            </div>
          </div>
        </div>
      </div>
      <MobileDialog isOpen={activeDialog === "mobile"} onClose={closeDialog} />
      <AboutDialog isOpen={activeDialog === "about"} onClose={closeDialog} />
      <DebugOverlay />
    </>
  );
};

const TopBar = () => {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="surface relative h-[120px] shadow-[0_4px_8px_var(--color-shadow-60)]">
      <div className="relative flex h-[120px] w-[750px] flex-row items-end pb-5 pl-[26px]">
        <button
          className="flex cursor-pointer items-end"
          onClick={() => openDialog("about")}
        >
          <div className="flex items-end">
            <DrumhausLogo size={46} color="#ff7b00" />
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

      <div className="absolute right-[26px] bottom-[18px] overflow-hidden rounded-2xl opacity-60 shadow-[0_2px_8px_var(--color-shadow-60)_inset]">
        <FrequencyAnalyzer />
      </div>
    </div>
  );
};

interface MainControlsProps {
  isPlaying: boolean;
  togglePlay: (instrumentRuntimes: InstrumentRuntime[]) => void;
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  loadPreset: (preset: PresetFileV1) => void;
}

const MainControls = ({
  isPlaying,
  togglePlay,
  instrumentRuntimes,
  instrumentRuntimesVersion,
  loadPreset,
}: MainControlsProps) => {
  return (
    <>
      <div className="shadow-[0_4px_8px_var(--color-shadow-60)]">
        <InstrumentGrid
          key={instrumentRuntimesVersion}
          instrumentRuntimes={instrumentRuntimes}
        />
      </div>

      <div className="flex w-full flex-row items-center justify-between px-8 py-4">
        <Tooltip content={isPlaying ? "Pause [Space]" : "Play [Space]"}>
          <Button
            variant="hardware"
            className="neu-medium-raised h-[140px] w-[140px] rounded-lg shadow-[var(--shadow-neu-md),0_0_2px_3px_var(--color-shadow-30)]"
            onClick={() => togglePlay(instrumentRuntimes)}
            onKeyDown={(ev) => ev.preventDefault()}
          >
            {isPlaying ? <IoPauseSharp size={50} /> : <IoPlaySharp size={50} />}
          </Button>
        </Tooltip>

        <SequencerControl />

        <TransportControl />

        <PresetControl loadPreset={loadPreset} />

        <MasterFX />

        <MasterCompressor />

        <MasterVolume />
      </div>
    </>
  );
};

const SequencerSection = () => {
  return (
    <div className="p-8 shadow-[0_4px_8px_var(--color-shadow-60)]">
      <Sequencer />
    </div>
  );
};

const BrandingLink = () => {
  return (
    <a
      className="absolute right-[26px] bottom-3 opacity-20"
      href="https://fung.studio/"
      target="_blank"
      rel="noreferrer"
    >
      <FungPeaceLogo color="#B09374" size={80} />
    </a>
  );
};

const Footer = () => {
  return (
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
  );
};

export default Drumhaus;
