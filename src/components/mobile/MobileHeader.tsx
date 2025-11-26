import { Menu } from "lucide-react";

import { DrumhausLogo } from "@/components/icon/DrumhausLogo";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";

interface MobileHeaderProps {
  onMenuOpen: () => void;
  onLogoClick: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onMenuOpen,
  onLogoClick,
}) => {
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  return (
    <>
      {/* Logo */}
      <button
        onClick={onLogoClick}
        className="hover:bg-surface-muted active:bg-surface-raised border-border flex w-full items-center border-b p-3 transition-colors"
        aria-label="About Drumhaus"
      >
        <DrumhausLogo size={24} color="#ff7b00" />
      </button>

      {/* Preset/Kit Info - Clickable Menu Trigger */}
      <button
        onClick={onMenuOpen}
        className="hover:bg-surface-raised active:bg-surface border-border bg-surface-muted relative w-full border-b px-4 py-2 transition-colors"
        aria-label="Open preset menu"
      >
        <div className="text-center">
          <div className="font-pixel text-foreground-emphasis text-sm">
            {currentPresetMeta.name}
          </div>
          <div className="text-foreground-muted text-xs">
            {currentKitMeta.name}
          </div>
        </div>
        <Menu
          size={20}
          className="text-foreground-emphasis absolute top-1/2 right-4 -translate-y-1/2"
        />
      </button>
    </>
  );
};
