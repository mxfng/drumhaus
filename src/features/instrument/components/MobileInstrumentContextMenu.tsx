import { Drum, Edit } from "lucide-react";

import { cn } from "@/shared/lib/utils";
import { useMobileNavStore } from "@/shared/store/useMobileNavStore";
import { Button } from "@/shared/ui";

export type InstrumentMode = "trigger" | "edit";

export const MobileInstrumentContextMenu: React.FC = () => {
  const mode = useMobileNavStore((state) => state.instrumentMode);
  const setInstrumentMode = useMobileNavStore(
    (state) => state.setInstrumentMode,
  );
  return (
    <div className="border-border bg-surface flex flex-row justify-between gap-2 border-t p-2">
      <div className="hardware-button-group flex flex-1 rounded-lg">
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-l-lg rounded-r-none", {
            "text-primary": mode === "trigger",
          })}
          onClick={() => setInstrumentMode("trigger")}
          size="sm"
        >
          <Drum size={16} />
          <span className="text-xs">TRIGGER MODE</span>
        </Button>
        <Button
          variant="hardware"
          className={cn("flex-1 gap-2 rounded-l-none rounded-r-lg", {
            "text-primary": mode === "edit",
          })}
          onClick={() => setInstrumentMode("edit")}
          size="sm"
        >
          <Edit size={16} />
          <span className="text-xs">EDIT MODE</span>
        </Button>
      </div>
    </div>
  );
};
