import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { InstrumentGrid } from "@/features/instrument/components/InstrumentGrid";
import { Sequencer } from "@/features/sequencer/components/Sequencer";
import { MobileDialog } from "@/shared/dialogs/MobileDialog";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { useLayoutScale } from "@/shared/hooks/useLayoutScale";
import { FungPeaceLogo } from "@/shared/icon/FungPeaceLogo";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { ControlsPanel } from "./ControlsPanel";
import Footer from "./Footer";
import { Header } from "./Header";

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
            <div className="neu-extra-tall bg-surface relative h-[900px] w-[1440px] overflow-clip rounded-xl">
              {/* Header */}
              <Header />

              <div className="bg-shadow h-1 w-full" />

              {/* Instrument Grid */}
              <InstrumentGrid key={instrumentRuntimesVersion} />

              <div className="bg-shadow h-1 w-full" />

              {/* Main Controls */}
              <ControlsPanel />

              <div className="bg-shadow h-1 w-full" />

              {/* Sequencer */}
              <div className="p-6">
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
