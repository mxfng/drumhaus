import { useState } from "react";
import { MoreVertical } from "lucide-react";

import { PresetActionsDialog } from "@/features/preset/dialogs/PresetActionsDialog";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import {
  Button,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

interface PresetSelectProps {
  selectedPresetId: string;
  defaultPresets: PresetFileV1[];
  customPresets: PresetFileV1[];
  onSelect: (value: string) => void;
  onRenamePreset?: (presetId: string, presetName: string) => void;
  onDuplicatePreset?: (presetId: string, presetName: string) => void;
  onDeletePreset?: (presetId: string, presetName: string) => void;
}

export const PresetSelect: React.FC<PresetSelectProps> = ({
  selectedPresetId,
  defaultPresets,
  customPresets,
  onSelect,
  onRenamePreset,
  onDuplicatePreset,
  onDeletePreset,
}) => {
  const hasManagementCallbacks =
    onRenamePreset || onDuplicatePreset || onDeletePreset;

  const [actionsDialogPreset, setActionsDialogPreset] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="group w-full px-1">
      <Select value={selectedPresetId} onValueChange={onSelect}>
        <SelectTrigger
          size="screen"
          className="text-screen-foreground w-full cursor-pointer rounded-none border-transparent bg-transparent px-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>In Haus</SelectLabel>
            {defaultPresets.map((preset) => (
              <SelectItem key={preset.meta.id} value={preset.meta.id}>
                {preset.meta.name}
              </SelectItem>
            ))}
          </SelectGroup>
          {customPresets.length > 0 && (
            <>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Custom</SelectLabel>
                {customPresets.map((preset) => (
                  <div
                    key={preset.meta.id}
                    className="group/preset relative flex items-center"
                  >
                    <SelectItem
                      value={preset.meta.id}
                      className="group-hover/preset:bg-accent group-hover/preset:text-accent-foreground flex-1 pr-8"
                    >
                      {preset.meta.name}
                    </SelectItem>

                    {hasManagementCallbacks && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="hover:text-accent-foreground/80 absolute right-0 h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setActionsDialogPreset({
                            id: preset.meta.id,
                            name: preset.meta.name,
                          });
                        }}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>

      {actionsDialogPreset && (
        <PresetActionsDialog
          isOpen={true}
          onClose={() => setActionsDialogPreset(null)}
          presetName={actionsDialogPreset.name}
          onRename={() =>
            onRenamePreset?.(actionsDialogPreset.id, actionsDialogPreset.name)
          }
          onDuplicate={() =>
            onDuplicatePreset?.(
              actionsDialogPreset.id,
              actionsDialogPreset.name,
            )
          }
          onDelete={() =>
            onDeletePreset?.(actionsDialogPreset.id, actionsDialogPreset.name)
          }
        />
      )}
    </div>
  );
};
