import { IoMdArrowDropdown } from "react-icons/io";

import type { KitFileV1 } from "@/types/instrument";

type KitSelectorProps = {
  selectedKitId: string;
  kits: KitFileV1[];
  onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export const KitSelector: React.FC<KitSelectorProps> = ({
  selectedKitId,
  kits,
  onSelect,
}) => {
  return (
    <>
      <span className="font-pixel text-text text-xs">KIT</span>

      <div className="group w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
        <div id="kit" className="relative mb-2 h-10 w-full">
          <select
            value={selectedKitId}
            className="font-pixel text-text h-10 w-[332px] cursor-pointer rounded-lg bg-transparent pl-4 outline-none"
            onChange={onSelect}
            onKeyDown={(ev) => ev.preventDefault()}
          >
            {kits.map((kit) => (
              <option key={kit.meta.id} value={kit.meta.id}>
                {kit.meta.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute top-0 right-0 bg-transparent p-2">
            <div>
              <div className="-mb-1 h-1/2 rotate-180">
                <IoMdArrowDropdown className="text-text group-hover:text-accent transition-all duration-200" />
              </div>
              <div className="h-1/2">
                <IoMdArrowDropdown className="text-text group-hover:text-accent transition-all duration-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
