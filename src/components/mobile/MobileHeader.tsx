import { ListMusic } from "lucide-react";

import { FrequencyAnalyzer } from "@/components/common/FrequencyAnalyzer";
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
      {/* Logo + Analyzer with Overlay Text */}
      <div className="border-border relative flex items-center border-b">
        <button
          onClick={onLogoClick}
          className="hover:bg-surface-muted active:bg-surface-raised text-primary relative z-10 flex items-center p-3 transition-colors"
          aria-label="About Drumhaus"
        >
          <DrumhausLogo size={24} color="currentColor" />
        </button>
        <div className="flex h-[50px] flex-1 items-center">
          <FrequencyAnalyzer height={80} />
        </div>
        {/* Preset/Kit Info Overlay - Clickable Menu Trigger */}
        <button
          onClick={onMenuOpen}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Open preset menu"
        >
          <div className="text-center">
            <div className="font-pixel text-foreground-emphasis text-sm">
              <mark className="bg-surface">{currentPresetMeta.name}</mark>
            </div>
            <div className="text-foreground-muted text-xs">
              <mark className="bg-surface text-foreground-muted">
                {currentKitMeta.name}
              </mark>
            </div>
          </div>
          <ListMusic
            size={20}
            className="text-foreground-muted bg-surface absolute top-1/2 right-4 -translate-y-1/2"
          />
        </button>
      </div>
    </>
  );
};
