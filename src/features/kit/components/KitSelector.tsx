import { ChevronsUpDown } from "lucide-react";

import {
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
    <div className="group w-full">
      <Select value={selectedKitId} onValueChange={onSelect}>
        <SelectTrigger className="text-screen-foreground h-5 w-full cursor-pointer bg-transparent px-0 focus-visible:ring-0 focus-visible:ring-offset-0">
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
  );
};
