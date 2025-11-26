import { Download, Save, Share2, Upload } from "lucide-react";

import { cn } from "@/lib/utils";
import { useDialogStore } from "@/stores/useDialogStore";
import type { KitFileV1 } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
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

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 transition-opacity",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
      />

      {/* Menu */}
      <div
        className={cn(
          "bg-primary text-primary-foreground shadow-neu fixed top-0 right-0 z-50 h-full w-64 overflow-y-auto transition-transform duration-300",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex flex-col gap-4 p-4">
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
            <h3 className="font-pixel mb-2 px-2 text-sm opacity-70">ACTIONS</h3>

            <button
              onClick={() => handleAction("save")}
              className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors"
            >
              <Save size={18} />
              Save Preset
            </button>

            <button
              onClick={() => handleAction("share")}
              className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors"
            >
              <Share2 size={18} />
              Share Link
            </button>

            <button
              onClick={() => handleAction("export")}
              className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors"
            >
              <Download size={18} />
              Export Kit
            </button>

            <button
              onClick={handleImport}
              className="font-pixel focus:bg-primary-muted hover:bg-primary-muted flex items-center gap-2 rounded-sm px-2 py-2 text-left text-sm transition-colors"
            >
              <Upload size={18} />
              Import Preset
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
