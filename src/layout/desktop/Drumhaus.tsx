import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { InstrumentGrid } from "@/features/instrument/components/InstrumentGrid";
import { Sequencer } from "@/features/sequencer/components/Sequencer";
import { MobileDialog } from "@/shared/dialogs/MobileDialog";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { useLayoutScale } from "@/shared/hooks/useLayoutScale";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { ControlsPanel } from "./ControlsPanel";
import Footer from "./Footer";
import { Header } from "./Header";

const renderDivider = () => {
  return (
    <div className="h-1 w-full shadow-[inset_2px_1px_2px_0_var(--color-shadow-30)]" />
  );
};

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
            <div className="hidden lg:block" />
            <div className="neu-extra-tall bg-surface relative h-[900px] w-[1440px] overflow-clip rounded-xl">
              {/* Header */}
              <Header />

              {renderDivider()}

              {/* Instrument Grid */}
              <InstrumentGrid key={instrumentRuntimesVersion} />

              {renderDivider()}

              {/* Main Controls */}
              <ControlsPanel />

              {renderDivider()}

              {/* Sequencer */}
              <div className="m-6">
                <Sequencer />
              </div>
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
