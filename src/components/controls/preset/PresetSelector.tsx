import { IoMdArrowDropdown } from "react-icons/io";

import type { PresetFileV1 } from "@/types/preset";

type PresetSelectorProps = {
  selectedPresetId: string;
  presets: PresetFileV1[];
  onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  presets,
  onSelect,
}) => {
  return (
    <>
      <span className="font-pixel text-xs text-text">PRESET</span>

      <div className="group w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
        <div id="preset" className="relative mb-2 h-10">
          <select
            value={selectedPresetId}
            className="h-10 w-[332px] cursor-pointer rounded-lg bg-transparent pl-4 font-pixel text-text outline-none"
            onChange={onSelect}
            onKeyDown={(ev) => ev.preventDefault()}
          >
            {presets.map((preset) => (
              <option key={preset.meta.id} value={preset.meta.id}>
                {preset.meta.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-0 top-0 bg-transparent p-2">
            <div>
              <div className="-mb-1 h-1/2 rotate-180">
                <IoMdArrowDropdown className="text-text transition-all duration-200 group-hover:text-accent" />
              </div>
              <div className="h-1/2">
                <IoMdArrowDropdown className="text-text transition-all duration-200 group-hover:text-accent" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
