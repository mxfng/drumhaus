import { ChevronsUpDown } from "lucide-react";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { PresetFileV1 } from "@/types/preset";

type PresetSelectorProps = {
  selectedPresetId: string;
  presets: PresetFileV1[];
  onSelect: (value: string) => void;
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  presets,
  onSelect,
}) => {
  return (
    <div>
      <Label>PRESET</Label>
      <div className="group w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
        <Select value={selectedPresetId} onValueChange={onSelect}>
          <SelectTrigger className="h-10 cursor-pointer rounded-lg bg-transparent pl-4 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
            <ChevronsUpDown className="group-hover:text-primary-muted h-4 w-4 transition-all duration-200" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.meta.id} value={preset.meta.id}>
                {preset.meta.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
