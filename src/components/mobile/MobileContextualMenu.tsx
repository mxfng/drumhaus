import { MobileBusControl } from "./MobileBusControl";
import {
  MobileInstrumentControl,
  type InstrumentMode,
} from "./MobileInstrumentControl";
import { MobileSequencerControl } from "./MobileSequencerControl";
import type { TabType } from "./MobileTabView";

interface MobileContextualMenuProps {
  activeTab: TabType;
  instrumentMode: InstrumentMode;
  onInstrumentModeChange: (mode: InstrumentMode) => void;
}

export const MobileContextualMenu: React.FC<MobileContextualMenuProps> = ({
  activeTab,
  instrumentMode,
  onInstrumentModeChange,
}) => {
  switch (activeTab) {
    case "controls":
      return <MobileSequencerControl />;
    case "instrument":
      return (
        <MobileInstrumentControl
          mode={instrumentMode}
          onModeChange={onInstrumentModeChange}
        />
      );
    case "bus":
      return <MobileBusControl />;
    case "transport":
      // Transport tab doesn't need a contextual menu (controls are in the main view)
      return null;
    default:
      return null;
  }
};
