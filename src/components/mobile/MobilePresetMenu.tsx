import { useRef, useState } from "react";
import { Download, ListMusic, Save, Share2, Upload, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDialogStore } from "@/stores/useDialogStore";
import type { KitFileV1 } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
import { Label } from "../ui";
import { MobileKitSelector } from "./MobileKitSelector";
import { MobilePresetSelector } from "./MobilePresetSelector";

interface MobilePresetMenuProps {
  isOpen: boolean;
  onClose: () => void;
  defaultPresets: PresetFileV1[];
  customPresets: PresetFileV1[];
  kits: KitFileV1[];
  selectedPresetId: string;
  selectedKitId: string;
  onPresetSelect: (value: string) => void;
  onKitSelect: (value: string) => void;
}

export const MobilePresetMenu: React.FC<MobilePresetMenuProps> = ({
  isOpen,
  onClose,
  defaultPresets,
  customPresets,
  kits,
  selectedPresetId,
  selectedKitId,
  onPresetSelect,
  onKitSelect,
}) => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartX = useRef(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAction = (dialogType: "save" | "share" | "export") => {
    openDialog(dialogType);
    onClose();
  };

  const handleImport = () => {
    // Trigger file import
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".dh";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // This will be handled by PresetControl logic
        const event = new CustomEvent("import-preset", { detail: file });
        window.dispatchEvent(event);
      }
    };
    input.click();
    onClose();
  };

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
      onClose();
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
        onClick={onClose}
      />

      {/* Menu */}
      <div
        ref={menuRef}
        className={cn(
          "bg-primary text-primary-foreground shadow-neu fixed top-0 right-0 z-50 h-full w-64 overflow-y-auto transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
          isSwiping && "!duration-0", // Remove transition during swipe for immediate feedback
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
        <div className="flex h-full flex-col justify-between gap-4 p-4">
          <ListMusic size={30} />
          <div className="flex h-full flex-col justify-center gap-4">
            {/* Preset & Kit Selectors */}
            <div className="flex flex-col gap-3">
              <MobilePresetSelector
                selectedPresetId={selectedPresetId}
                defaultPresets={defaultPresets}
                customPresets={customPresets}
                onSelect={onPresetSelect}
              />
              <MobileKitSelector
                selectedKitId={selectedKitId}
                kits={kits}
                onSelect={onKitSelect}
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
                onClick={handleImport}
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
            onClick={onClose}
            className="font-pixel bg-primary-muted hover:bg-primary-foreground/20 flex items-center justify-center gap-2 rounded-sm px-4 py-3 transition-colors"
          >
            <X size={18} />
            Close Menu
          </button>
        </div>
      </div>
    </>
  );
};
