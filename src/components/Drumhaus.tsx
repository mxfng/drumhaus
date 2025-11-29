import { useKeyboardShortcuts } from "@/hooks/ui/useKeyboardShortcuts";
import { useLayoutScale } from "@/hooks/ui/useLayoutScale";
import { useDrumhaus } from "@/providers/DrumhausProvider";
import { useDialogStore } from "@/stores/useDialogStore";
import { InstrumentGrid } from "../features/instruments/components/InstrumentGrid";
import { ControlsPanel } from "./controls/ControlsPanel";
import { MobileDialog } from "./dialog/MobileDialog";
import Footer from "./Footer";
import { Header } from "./Header";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { Sequencer } from "./sequencer/Sequencer";

const Drumhaus = () => {
  // --- Context ---
  const { instrumentRuntimes, instrumentRuntimesVersion } = useDrumhaus();

  // --- Store State ---
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);

  // --- Desktop-specific Hooks ---
  const { scale } = useLayoutScale();
  useKeyboardShortcuts({
    instrumentRuntimes,
    instrumentRuntimesVersion,
  });

  return (
    <div className="h-screen w-screen overflow-auto">
      <div className="drumhaus-root">
        <div
          className="drumhaus-scale-wrapper"
          style={{ "--scale": scale } as React.CSSProperties}
        >
          <div className="animate-fade-in">
            <div className="hidden h-[50px] lg:block" />
            <div className="neu-extra-tall bg-surface relative h-[1000px] w-[1538px] overflow-clip rounded-xl">
              {/* Header */}
              <Header />

              {/* Instrument Grid */}
              <div className="shadow-[0_4px_8px_var(--color-shadow-60)]">
                <InstrumentGrid key={instrumentRuntimesVersion} />
              </div>

              {/* Main Controls */}
              <ControlsPanel />

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
            <Footer />
          </div>
        </div>
      </div>

      <MobileDialog isOpen={activeDialog === "mobile"} onClose={closeDialog} />
    </div>
  );
};

export default Drumhaus;
