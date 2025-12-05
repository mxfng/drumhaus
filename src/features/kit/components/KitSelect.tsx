import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui";
import { KitFileV1 } from "../types/kit";

interface KitSelectProps {
  selectedKitId: string;
  kits: KitFileV1[];
  onSelect: (value: string) => void;
}

export const KitSelect: React.FC<KitSelectProps> = ({
  selectedKitId,
  kits,
  onSelect,
}) => {
  return (
    <div className="group w-full">
      <Select value={selectedKitId} onValueChange={onSelect}>
        <SelectTrigger
          size="screen"
          className="text-screen-foreground w-full cursor-pointer border-transparent bg-transparent px-0 focus-visible:ring-offset-0"
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
};
