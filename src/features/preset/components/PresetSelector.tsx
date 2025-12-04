import { ChevronsUpDown } from "lucide-react";

import type { PresetFileV1 } from "@/features/preset/types/preset";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";

type PresetSelectorProps = {
  selectedPresetId: string;
  defaultPresets: PresetFileV1[];
  customPresets: PresetFileV1[];
  onSelect: (value: string) => void;
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  defaultPresets,
  customPresets,
  onSelect,
}) => {
  return (
    <div className="group w-full">
      <Select value={selectedPresetId} onValueChange={onSelect}>
        <SelectTrigger className="text-screen-foreground h-5 w-full cursor-pointer bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0">
          <SelectValue />
          <ChevronsUpDown className="group-hover:text-primary-muted h-4 w-4 transition-all duration-200" />
        </SelectTrigger>
        <SelectContent>
          {defaultPresets.map((preset) => (
            <SelectItem key={preset.meta.id} value={preset.meta.id}>
              {preset.meta.name}
            </SelectItem>
          ))}
          {customPresets.length > 0 && (
            <>
              <SelectSeparator />
              {customPresets.map((preset) => (
                <SelectItem key={preset.meta.id} value={preset.meta.id}>
                  {preset.meta.name}
                </SelectItem>
              ))}
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
};
