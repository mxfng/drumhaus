import { Edit, Play } from "lucide-react";

import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

export type InstrumentMode = "trigger" | "edit";

interface MobileInstrumentControlProps {
  mode: InstrumentMode;
  onModeChange: (mode: InstrumentMode) => void;
}

export const MobileInstrumentControl: React.FC<
  MobileInstrumentControlProps
> = ({ mode, onModeChange }) => {
  return (
    <div className="border-border bg-surface flex flex-row justify-between gap-2 border-t p-2">
      <div className="hardware-button-group flex flex-1 rounded-lg">
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-l-lg rounded-r-none", {
            "text-primary": mode === "trigger",
          })}
          onClick={() => onModeChange("trigger")}
          size="sm"
        >
          <Play size={16} />
          <span className="text-xs">TRIGGER MODE</span>
        </Button>
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-l-none rounded-r-lg", {
            "text-primary": mode === "edit",
          })}
          onClick={() => onModeChange("edit")}
          size="sm"
        >
          <Edit size={16} />
          <span className="text-xs">EDIT MODE</span>
        </Button>
      </div>
    </div>
  );
};
