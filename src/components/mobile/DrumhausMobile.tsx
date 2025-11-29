import { useScrollLock } from "@/hooks/ui/useScrollLock";
import { MobileContextMenu } from "./contextmenu/MobileContextMenu";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileHeader } from "./MobileHeader";
import { MobileTabView } from "./MobileTabView";
import { MobilePresetMenu } from "./preset/MobilePresetMenu";

const DrumhausMobile: React.FC = () => {
  // Mobile-specific UI hooks
  useScrollLock(true);

  return (
    <div className="bg-surface flex h-dvh flex-col overflow-x-hidden overflow-y-hidden overscroll-none">
      {/* Header: Logo + Preset Info */}
      <MobileHeader />

      {/* Tabbed View: Instrument / Controls */}
      <MobileTabView />

      {/* Contextual Menu - changes based on active tab */}
      <MobileContextMenu />

      {/* Bottom Navigation */}
      <MobileBottomNav />

      {/* Preset Menu */}
      <MobilePresetMenu />
    </div>
  );
};

export default DrumhausMobile;
