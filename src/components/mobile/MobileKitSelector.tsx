import { ChevronsUpDown } from "lucide-react";

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import type { KitFileV1 } from "@/types/instrument";

type MobileKitSelectorProps = {
  selectedKitId: string;
  kits: KitFileV1[];
  onSelect: (value: string) => void;
};

export const MobileKitSelector: React.FC<MobileKitSelectorProps> = ({
  selectedKitId,
  kits,
  onSelect,
}) => {
  return (
    <div>
      <Label className="text-primary-foreground text-xs">KIT</Label>
      <div className="group w-full rounded-lg">
        <Select value={selectedKitId} onValueChange={onSelect}>
          <SelectTrigger className="border-primary-foreground/20 h-10 cursor-pointer rounded-lg border bg-transparent pl-4 focus:ring-0 focus:ring-offset-0">
            <SelectValue />
            <ChevronsUpDown className="group-hover:text-primary-foreground/70 h-4 w-4 transition-all duration-200" />
          </SelectTrigger>
          <SelectContent variant="mobile">
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
