import { ChevronsUpDown } from "lucide-react";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { KitFileV1 } from "../types/kit";

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
    <div>
      <Label>KIT</Label>
      <div className="group w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
        <Select value={selectedKitId} onValueChange={onSelect}>
          <SelectTrigger className="h-10 cursor-pointer rounded-lg bg-transparent pl-4 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
            <ChevronsUpDown className="group-hover:text-primary-muted h-4 w-4 transition-all duration-200" />
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
  );
};
