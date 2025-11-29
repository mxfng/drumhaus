import { MobileInstrumentContextMenu } from "@/features/instrument/components/MobileInstrumentContextMenu";
import { MobileBusContextMenu } from "@/features/master-bus/components/MobileBusContextMenu";
import { MobileSequencerContextMenu } from "@/features/sequencer/components/MobileSequencerContextMenu";
import { useMobileNavStore } from "@/shared/store/useMobileNavStore";

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
