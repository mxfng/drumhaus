import { ListMusic } from "lucide-react";

import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { FrequencyAnalyzer } from "@/shared/components/FrequencyAnalyzer";
import { DrumhausLogo } from "@/shared/icon/DrumhausLogo";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { useMobileNavStore } from "@/shared/store/useMobileNavStore";

export const MobileHeader: React.FC = () => {
  const setMenuOpen = useMobileNavStore((state) => state.setMenuOpen);
  const openDialog = useDialogStore((state) => state.openDialog);
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  return (
    <>
      {/* Logo + Analyzer with Overlay Text */}
      <div className="border-border relative flex items-center border-b">
        <button
          onClick={() => openDialog("about")}
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
          onClick={() => setMenuOpen(true)}
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
