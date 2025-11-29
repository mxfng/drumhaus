import { useRef, useState } from "react";
import { Download, ListMusic, Save, Share2, Upload, X } from "lucide-react";

import { ConfirmSelectPresetDialog } from "@/components/dialog/ConfirmSelectPresetDialog";
import { ExportDialog } from "@/components/dialog/ExportDialog";
import { SaveDialog } from "@/components/dialog/SaveDialog";
import { ShareDialog } from "@/components/dialog/ShareDialog";
import { Label } from "@/components/ui";
import { usePresetManager } from "@/hooks/usePresetManager";
import { cn } from "@/lib/utils";
import { useDrumhaus } from "@/providers/DrumhausProvider";
import { useDialogStore } from "@/stores/useDialogStore";
import { useMobileNavStore } from "@/stores/useMobileNavStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { MobileKitSelector } from "./MobileKitSelector";
import { MobilePresetSelector } from "./MobilePresetSelector";

export const MobilePresetMenu: React.FC = () => {
  const isOpen = useMobileNavStore((state) => state.menuOpen);
  const setMenuOpen = useMobileNavStore((state) => state.setMenuOpen);

  // Dialogs
  const openDialog = useDialogStore((state) => state.openDialog);
  const activeDialog = useDialogStore((state) => state.activeDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const presetToChange = useDialogStore(
    (state) => state.dialogData.presetToChange,
  );

  // Preset/Kit metadata
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  // State
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const { loadPreset } = useDrumhaus();

  // Preset Manager
  const {
    kits,
    defaultPresets,
    customPresets,
    allPresets,
    switchKit,
    switchPreset,
    exportPreset,
    importPreset,
    sharePreset,
  } = usePresetManager({ loadPreset });

  // --- Handlers ---

  // Kit selection handler
  const handleKitChange = (kitId: string) => {
    switchKit(kitId);
    setMenuOpen(false);
  };

  // Preset selection handler
  const handlePresetChange = (presetId: string) => {
    switchPreset(presetId);
    setMenuOpen(false);
  };

  const handleConfirmPresetChange = () => {
    closeDialog();
    const preset = allPresets.find((p) => p.meta.id === presetToChange);
    if (preset) {
      loadPreset(preset);
      setMenuOpen(false);
    } else {
      console.error(`Preset ${presetToChange} not found`);
    }
  };

  // --- Handlers (Dialog) ---

  const handleAction = (dialogType: "save" | "share" | "export") => {
    openDialog(dialogType);
    setMenuOpen(false);
  };

  // --- Handlers for swipe gestures ---

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const diff = currentX - touchStartX.current;

    // Only allow swiping to the right (closing direction)
    if (diff > 0) {
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    // Close if swiped more than 100px
    if (swipeOffset > 100) {
      setMenuOpen(false);
    }

    // Reset offset with a small delay to allow animation
    setTimeout(() => setSwipeOffset(0), 0);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "bg-shadow-30 fixed inset-0 z-40 backdrop-blur-xs transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMenuOpen(false)}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className={cn(
          "bg-primary text-primary-foreground shadow-neu fixed top-0 right-0 z-50 h-full w-64 overflow-y-auto transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
          isSwiping && "duration-0!", // Remove transition during swipe for immediate feedback
        )}
        style={{
          transform: isOpen
            ? `translateX(${swipeOffset}px)`
            : "translateX(100%)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex h-full flex-col justify-between gap-4 p-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <ListMusic size={30} />
          <div className="flex h-full flex-col justify-center gap-4">
            {/* Preset & Kit Selectors */}
            <div className="flex flex-col gap-3">
              <MobilePresetSelector
                selectedPresetId={currentPresetMeta.id}
                defaultPresets={defaultPresets}
                customPresets={customPresets}
                onSelect={handlePresetChange}
              />
              <MobileKitSelector
                selectedKitId={currentKitMeta.id}
                kits={kits}
                onSelect={handleKitChange}
              />
            </div>

            {/* Divider */}
            <div className="bg-primary-foreground/20 h-px" />

            {/* Actions */}
            <div className="flex flex-col">
              <Label className="text-primary-foreground text-xs">ACTIONS</Label>

              <button
                onClick={() => handleAction("save")}
                className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors"
              >
                <Save size={18} />
                Save Preset
              </button>

              <button
                onClick={() => handleAction("share")}
                className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors"
              >
                <Share2 size={18} />
                Share Link
              </button>

              <button
                onClick={() => handleAction("export")}
                className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors"
              >
                <Download size={18} />
                Export Kit
              </button>

              <button
                onClick={importPreset}
                className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left transition-colors"
              >
                <Upload size={18} />
                Import Preset
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="bg-primary-foreground/20 h-px" />

          {/* Close Button */}
          <button
            onClick={() => setMenuOpen(false)}
            className="font-pixel bg-primary-muted hover:bg-primary-foreground/20 flex items-center justify-center gap-2 rounded-sm px-4 py-3 transition-colors"
          >
            <X size={18} />
            Close Menu
          </button>
        </div>
      </div>

      {/* Dialogs */}
      <SaveDialog
        isOpen={activeDialog === "save"}
        onClose={closeDialog}
        onSave={exportPreset}
      />
      <ShareDialog
        isOpen={activeDialog === "share"}
        onClose={closeDialog}
        onShare={sharePreset}
      />
      <ExportDialog isOpen={activeDialog === "export"} onClose={closeDialog} />
      <ConfirmSelectPresetDialog
        isOpen={activeDialog === "presetChange"}
        onClose={closeDialog}
        onSelect={handleConfirmPresetChange}
      />
    </>
  );
};
