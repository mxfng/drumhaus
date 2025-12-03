import { lazy, Suspense } from "react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { InstrumentGrid } from "@/features/instrument/components/InstrumentGrid";
import { Sequencer } from "@/features/sequencer/components/Sequencer";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { useLayoutScale } from "@/shared/hooks/useLayoutScale";
import { useMobileWarning } from "@/shared/hooks/useMobileWarning";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { ControlsPanel } from "./ControlsPanel";
import { FloatingMenu } from "./FloatingMenu";
import { Footer } from "./Footer";
import { Header } from "./Header";

const MobileDialog = lazy(() =>
  import("@/shared/dialogs/MobileDialog").then((module) => ({
    default: module.MobileDialog,
  })),
);

const renderDivider = () => {
  return (
    <div className="bg-shadow-10 h-1 w-full shadow-[inset_2px_1px_2px_0_var(--color-shadow-30)]" />
  );
};

const Drumhaus = () => {
  // --- Context ---
  const { instrumentRuntimes, instrumentRuntimesVersion } = useDrumhaus();

  // --- Store State ---
  const isMobileDialogOpen = useDialogStore(
    (state) => state.activeDialog === "mobile",
  );
  const closeDialog = useDialogStore((state) => state.closeDialog);

  // --- Desktop-specific Hooks ---
  const { scale } = useLayoutScale();

  useMobileWarning();

  useKeyboardShortcuts({
    instrumentRuntimes,
    instrumentRuntimesVersion,
  });

  return (
    <>
      <div
        className="drumhaus-root animate-fade-in"
        style={{
          // @ts-expect-error - CSS custom property
          "--layout-scale": scale / 100,
        }}
      >
        <FloatingMenu />
        <div
          className="drumhaus-scale-wrapper"
          style={{
            transform: `translate(-50%, -50%) scale(${scale / 100})`,
            transformOrigin: "center center",
          }}
        >
          {/* Header buffer */}
          <div className="h-10" />

          <div className="neu-medium-raised surface border-border relative h-225 w-360 overflow-clip rounded-xl border">
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
            <Sequencer />
          </div>

          {/* Footer */}
          <Footer />
        </div>
      </div>

      <Suspense fallback={null}>
        <MobileDialog isOpen={isMobileDialogOpen} onClose={closeDialog} />
      </Suspense>
    </>
  );
};

export default Drumhaus;
