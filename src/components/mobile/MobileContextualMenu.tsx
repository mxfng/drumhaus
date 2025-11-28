import { MobileBusControl, type BusSubTab } from "./MobileBusControl";
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
  busSubTab: BusSubTab;
  onBusSubTabChange: (subTab: BusSubTab) => void;
}

export const MobileContextualMenu: React.FC<MobileContextualMenuProps> = ({
  activeTab,
  instrumentMode,
  onInstrumentModeChange,
  busSubTab,
  onBusSubTabChange,
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
      return (
        <MobileBusControl
          activeSubTab={busSubTab}
          onSubTabChange={onBusSubTabChange}
        />
      );
    default:
      return null;
  }
};
