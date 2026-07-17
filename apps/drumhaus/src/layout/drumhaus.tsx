import { ShellRoot, ShellScaleWrapper } from "@haus/shell";
import { Separator } from "@haus/ui";

import { InstrumentGrid } from "@/features/instrument/components/instrument-grid";
import { Sequencer } from "@/features/sequencer/components/sequencer";
import { LinkControl } from "@/features/session/components/link-control";
import { layoutScale } from "@/shared/store/layout-scale";
import { ControlsPanel } from "./controls-panel";
import { FloatingMenu } from "./floating-menu";
import { Footer } from "./footer";
import { Header } from "./header";

const Drumhaus = () => {
  return (
    <ShellRoot layoutScale={layoutScale}>
      <FloatingMenu />
      {/* LINK ships dark: build-time flag, so off means fully absent. */}
      {__ENABLE_LINK__ && <LinkControl />}
      <ShellScaleWrapper layoutScale={layoutScale}>
        {/* Header buffer */}
        <div className="h-10" />

        <div className="neu-medium-raised surface relative h-225 w-360 overflow-clip rounded-xl border">
          {/* Header */}
          <Header />

          <Separator variant="neumorphic" />

          {/* Instrument Grid */}
          <InstrumentGrid />

          <Separator variant="neumorphic" />

          {/* Main Controls */}
          <ControlsPanel />

          <Separator variant="neumorphic" />

          {/* Sequencer */}
          <Sequencer />
        </div>

        {/* Footer */}
        <Footer />
      </ShellScaleWrapper>
    </ShellRoot>
  );
};

export default Drumhaus;
