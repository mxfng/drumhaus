import { lazy, Suspense } from "react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { InstrumentGrid } from "@/features/instrument/components/InstrumentGrid";
import { Sequencer } from "@/features/sequencer/components/Sequencer";
import { useLayoutScale } from "@/shared/hooks/useLayoutScale";
import { useMobileWarning } from "@/shared/hooks/useMobileWarning";
import { useSpacebarTogglePlay } from "@/shared/hooks/useSpacebarTogglePlay";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { Separator } from "@/shared/ui";
import { ControlsPanel } from "./ControlsPanel";
import { FloatingMenu } from "./FloatingMenu";
import { Footer } from "./Footer";
import { Header } from "./Header";

const MobileDialog = lazy(() =>
  import("@/shared/dialogs/MobileDialog").then((module) => ({
    default: module.MobileDialog,
  })),
);

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

  useSpacebarTogglePlay({
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

          <div className="neu-medium-raised surface relative h-225 w-360 overflow-clip rounded-xl border">
            {/* Header */}
            <Header />

            <Separator variant="neumorphic" />

            {/* Instrument Grid */}
            <InstrumentGrid key={instrumentRuntimesVersion} />

            <Separator variant="neumorphic" />

            {/* Main Controls */}
            <ControlsPanel />

            <Separator variant="neumorphic" />

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
