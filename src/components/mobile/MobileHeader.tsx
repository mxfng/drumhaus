import { ListMusic, Menu } from "lucide-react";

import { FrequencyAnalyzer } from "@/components/FrequencyAnalyzer";
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
      {/* Logo + Analyzer */}
      <div className="border-border flex items-center border-b">
        <button
          onClick={onLogoClick}
          className="hover:bg-surface-muted active:bg-surface-raised text-primary flex items-center p-3 transition-colors"
          aria-label="About Drumhaus"
        >
          <DrumhausLogo size={24} color="currentColor" />
        </button>
        <div className="flex h-[50px] flex-1 items-center">
          <FrequencyAnalyzer height={80} />
        </div>
      </div>

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
        <ListMusic
          size={20}
          className="text-foreground-emphasis absolute top-1/2 right-4 -translate-y-1/2"
        />
      </button>
    </>
  );
};
