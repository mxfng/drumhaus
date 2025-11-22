import { IoMdArrowDropdown } from "react-icons/io";

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
    <>
      <Label>PRESET</Label>

      <div className="group w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
        <div id="preset" className="relative mb-2 h-10">
          <Select value={selectedPresetId} onValueChange={onSelect}>
            <SelectTrigger className="h-10 cursor-pointer rounded-lg bg-transparent pl-4 focus:ring-0 focus:ring-offset-0">
              <SelectValue />
              <div className="pointer-events-none">
                <div className="-mb-1 h-1/2 rotate-180">
                  <IoMdArrowDropdown className="group-hover:text-accent transition-all duration-200" />
                </div>
                <div className="h-1/2">
                  <IoMdArrowDropdown className="group-hover:text-accent transition-all duration-200" />
                </div>
              </div>
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
    </>
  );
};
