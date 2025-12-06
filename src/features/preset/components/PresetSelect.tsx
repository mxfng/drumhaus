import { MoreVertical } from "lucide-react";

import type { PresetFileV1 } from "@/features/preset/types/preset";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

  return (
    <div className="group w-full">
      <Select value={selectedPresetId} onValueChange={onSelect}>
        <SelectTrigger
          size="screen"
          className="text-screen-foreground w-full cursor-pointer border-transparent bg-transparent px-1 focus-visible:ring-offset-0"
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:text-accent-foreground/80 absolute right-0 h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          side="right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {onRenamePreset && (
                            <DropdownMenuItem
                              onSelect={() =>
                                onRenamePreset(preset.meta.id, preset.meta.name)
                              }
                            >
                              Rename
                            </DropdownMenuItem>
                          )}
                          {onDuplicatePreset && (
                            <DropdownMenuItem
                              onSelect={() =>
                                onDuplicatePreset(
                                  preset.meta.id,
                                  preset.meta.name,
                                )
                              }
                            >
                              Duplicate
                            </DropdownMenuItem>
                          )}
                          {onDeletePreset && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() =>
                                  onDeletePreset(
                                    preset.meta.id,
                                    preset.meta.name,
                                  )
                                }
                              >
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
