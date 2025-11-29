import type { TabType } from "../MobileTabView";
import { MobileBusContextMenu, type BusSubTab } from "./MobileBusContextMenu";
import {
  MobileInstrumentContextMenu,
  type InstrumentMode,
} from "./MobileInstrumentContextMenu";
import { MobileSequencerContextMenu } from "./MobileSequencerContextMenu";

interface MobileContextMenuProps {
  activeTab: TabType;
  instrumentMode: InstrumentMode;
  onInstrumentModeChange: (mode: InstrumentMode) => void;
  busSubTab: BusSubTab;
  onBusSubTabChange: (subTab: BusSubTab) => void;
}

export const MobileContextMenu: React.FC<MobileContextMenuProps> = ({
  activeTab,
  instrumentMode,
  onInstrumentModeChange,
  busSubTab,
  onBusSubTabChange,
}) => {
  switch (activeTab) {
    case "controls":
      return <MobileSequencerContextMenu />;
    case "instrument":
      return (
        <MobileInstrumentContextMenu
          mode={instrumentMode}
          onModeChange={onInstrumentModeChange}
        />
      );
    case "bus":
      return (
        <MobileBusContextMenu
          activeSubTab={busSubTab}
          onSubTabChange={onBusSubTabChange}
        />
      );
    default:
      return null;
  }
};
