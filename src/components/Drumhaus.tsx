import { useEffect } from "react";
import { IoPauseSharp, IoPlaySharp } from "react-icons/io5";

import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useMobileWarning } from "@/hooks/useMobileWarning";
import { usePresetLoading } from "@/hooks/usePresetLoading";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
import { MasterControl } from "./controls/MasterControl";
import { PresetControl } from "./controls/PresetControl";
import { SequencerControl } from "./controls/SequencerControl";
import { TransportControl } from "./controls/TransportControl";
import FrequencyAnalyzer from "./FrequencyAnalyzer";
import { DrumhausLogo } from "./icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "./icon/DrumhausTypographyLogo";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { InstrumentGrid } from "./instrument/InstrumentGrid";
import { MobileModal } from "./modal/MobileModal";
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

  const { isMobileWarning, setIsMobileWarning } = useMobileWarning();

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
          style={{ transform: `scale(${scale})` }}
        >
          <div className="animate-fade-in">
            <div className="neumorphicExtraTall relative h-[1000px] w-[1538px] overflow-clip rounded-xl bg-[silver]">
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
            <div className="relative h-5 w-full">
              <Footer />
            </div>
          </div>
        </div>
      </div>
      <MobileModal
        isOpen={isMobileWarning}
        onClose={() => setIsMobileWarning(false)}
      />
    </>
  );
};

const TopBar = () => {
  return (
    <div className="relative h-[120px] shadow-[0_4px_8px_var(--color-shadow-60)]">
      <div className="relative flex h-[120px] w-[750px] flex-row items-end pb-5 pl-[26px]">
        <div className="flex items-end">
          <DrumhausLogo size={46} color="#ff7b00" />
        </div>
        <div className="ml-2 flex items-end">
          <DrumhausTypographyLogo color="#ff7b00" size={420} />
        </div>
        <div className="-mb-1 ml-4">
          <p className="text-gray-500 opacity-70">Browser Controlled</p>
          <p className="text-gray-500 opacity-70">Rhythmic Groove Machine</p>
        </div>
      </div>

      <div className="absolute bottom-[18px] right-[26px] overflow-hidden rounded-2xl opacity-60 shadow-[0_2px_8px_var(--color-shadow-60)_inset]">
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

      <div className="grid w-full grid-cols-7 py-4 pl-4">
        <div className="col-span-1 mr-6 w-[160px]">
          <div className="flex h-full w-full items-center justify-center">
            <button
              className="neumorphicTallRaised h-[140px] w-[140px] outline-none"
              onClick={() => togglePlay(instrumentRuntimes)}
              onKeyDown={(ev) => ev.preventDefault()}
            >
              {isPlaying ? (
                <IoPauseSharp size={50} color="#ff7b00" />
              ) : (
                <IoPlaySharp size={50} color="#B09374" />
              )}
            </button>
          </div>
        </div>

        <div className="col-span-1 -ml-3 mx-0">
          <SequencerControl />
        </div>

        <div className="col-span-1 px-2">
          <TransportControl />
        </div>

        <div className="w-[380px] px-2">
          <PresetControl loadPreset={loadPreset} />
        </div>

        <MasterControl />
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
      className="absolute bottom-3 right-[26px] opacity-20"
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
      <div className="mt-8 flex">
        <p className="text-sm text-gray-500">Designed with love by</p>
        <a
          href="https://fung.studio/"
          target="_blank"
          rel="noreferrer"
          className="ml-1 text-sm text-gray-500"
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
