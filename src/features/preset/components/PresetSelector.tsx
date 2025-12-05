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
        <SelectTrigger
          size="screen"
          className="text-screen-foreground w-full cursor-pointer border-transparent bg-transparent px-0 focus-visible:ring-offset-0"
        >
          <SelectValue />
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
