import { IoMdArrowDropdown } from "react-icons/io";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { KitFileV1 } from "@/types/instrument";

type KitSelectorProps = {
  selectedKitId: string;
  kits: KitFileV1[];
  onSelect: (value: string) => void;
};

export const KitSelector: React.FC<KitSelectorProps> = ({
  selectedKitId,
  kits,
  onSelect,
}) => {
  return (
    <div className="-mt-2">
      <Label>KIT</Label>

      <div className="group w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
        <div id="kit" className="relative mb-2 h-10 w-full">
          <Select value={selectedKitId} onValueChange={onSelect}>
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
              {kits.map((kit) => (
                <SelectItem key={kit.meta.id} value={kit.meta.id}>
                  {kit.meta.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
