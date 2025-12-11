import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { InstrumentGrid } from "@/features/instrument/components/InstrumentGrid";
import { Sequencer } from "@/features/sequencer/components/Sequencer";
import { useLayoutScale } from "@/shared/hooks/useLayoutScale";
import { Separator } from "@/shared/ui";
import { ControlsPanel } from "./ControlsPanel";
import { FloatingMenu } from "./FloatingMenu";
import { Footer } from "./Footer";
import { Header } from "./Header";

const Drumhaus = () => {
  // --- Context ---
  const { instrumentRuntimesVersion } = useDrumhaus(); // Force re-rendering instrument grid to display waveform when loaded

  // --- Layout ---
  const { scale } = useLayoutScale();

  return (
    <div
      className="drumhaus-root"
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
  );
};

export default Drumhaus;
