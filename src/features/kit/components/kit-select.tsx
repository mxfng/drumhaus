import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/design/ui";

import { KitFile } from "../types/kit";

interface KitSelectProps {
  selectedKitId: string;
  kits: KitFile[];
  onSelect: (value: string) => void;
}

function KitSelect({ selectedKitId, kits, onSelect }: KitSelectProps) {
  return (
    <div className="group w-full px-1">
      <Select value={selectedKitId} onValueChange={onSelect}>
        <SelectTrigger
          size="screen"
          aria-label="Kit"
          className="text-screen-foreground w-full cursor-pointer rounded-none border-transparent bg-transparent px-1 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <SelectValue />
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
}

export { KitSelect };
