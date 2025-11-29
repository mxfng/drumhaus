import { MobilePresetMenu } from "@/features/preset/components/MobilePresetMenu";
import { useScrollLock } from "@/shared/hooks/useScrollLock";
import { useTouchHoldBlock } from "@/shared/hooks/useTouchHoldBlock";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileContextMenu } from "./MobileContextMenu";
import { MobileHeader } from "./MobileHeader";
import { MobileTabView } from "./MobileTabView";

const DrumhausMobile: React.FC = () => {
  // Mobile-specific UI hooks
  useScrollLock(true);
  useTouchHoldBlock(true);

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
