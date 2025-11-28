import { Gauge, Sliders, Volume2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type BusSubTab = "comp" | "fx" | "level" | "tempo";

interface MobileBusControlProps {
  activeSubTab: BusSubTab;
  onSubTabChange: (subTab: BusSubTab) => void;
}

export const MobileBusControl: React.FC<MobileBusControlProps> = ({
  activeSubTab,
  onSubTabChange,
}) => {
  return (
    <div className="border-border bg-surface flex flex-col gap-2 border-t p-2">
      <div className="hardware-button-group flex rounded-lg">
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-l-lg rounded-r-none", {
            "text-primary": activeSubTab === "comp",
          })}
          size="sm"
          onClick={() => onSubTabChange("comp")}
        >
          <Gauge size={16} />
          <span className="text-xs">COMP</span>
        </Button>
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-none", {
            "text-primary": activeSubTab === "fx",
          })}
          size="sm"
          onClick={() => onSubTabChange("fx")}
        >
          <Wand2 size={16} />
          <span className="text-xs">FX</span>
        </Button>
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-none", {
            "text-primary": activeSubTab === "level",
          })}
          size="sm"
          onClick={() => onSubTabChange("level")}
        >
          <Volume2 size={16} />
          <span className="text-xs">LEVEL</span>
        </Button>
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-l-none rounded-r-lg", {
            "text-primary": activeSubTab === "tempo",
          })}
          size="sm"
          onClick={() => onSubTabChange("tempo")}
        >
          <Sliders size={16} />
          <span className="text-xs">TEMPO</span>
        </Button>
      </div>
    </div>
  );
};
