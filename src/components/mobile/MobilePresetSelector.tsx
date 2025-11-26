import { ChevronsUpDown } from "lucide-react";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { PresetFileV1 } from "@/types/preset";

type MobilePresetSelectorProps = {
  selectedPresetId: string;
  defaultPresets: PresetFileV1[];
  customPresets: PresetFileV1[];
  onSelect: (value: string) => void;
};

export const MobilePresetSelector: React.FC<MobilePresetSelectorProps> = ({
  selectedPresetId,
  defaultPresets,
  customPresets,
  onSelect,
}) => {
  return (
    <div>
      <Label className="text-primary-foreground">PRESET</Label>
      <div className="group w-full rounded-lg">
        <Select value={selectedPresetId} onValueChange={onSelect}>
          <SelectTrigger className="border-primary-foreground/20 h-10 cursor-pointer rounded-lg border bg-transparent pl-4 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
            <ChevronsUpDown className="group-hover:text-primary-foreground/70 h-4 w-4 transition-all duration-200" />
          </SelectTrigger>
          <SelectContent variant="mobile">
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
    </div>
  );
};
