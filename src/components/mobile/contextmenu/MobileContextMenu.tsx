import { useMobileNavStore } from "@/stores/useMobileNavStore";
import { MobileBusContextMenu } from "./MobileBusContextMenu";
import { MobileInstrumentContextMenu } from "./MobileInstrumentContextMenu";
import { MobileSequencerContextMenu } from "./MobileSequencerContextMenu";

export const MobileContextMenu: React.FC = () => {
  const activeTab = useMobileNavStore((state) => state.activeTab);
  switch (activeTab) {
    case "controls":
      return <MobileSequencerContextMenu />;
    case "instrument":
      return <MobileInstrumentContextMenu />;
    case "bus":
      return <MobileBusContextMenu />;
    default:
      return null;
  }
};
