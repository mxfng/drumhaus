import { Gauge, Sliders, Volume2, Wand2 } from "lucide-react";

import { Button } from "@/components/ui";

export const MobileBusControl: React.FC = () => {
  return (
    <div className="border-border bg-surface flex flex-col gap-2 border-t p-2">
      <div className="hardware-button-group flex rounded-lg">
        <Button
          variant="hardware"
          className="flex-1 gap-2 rounded-l-lg rounded-r-none"
          size="sm"
        >
          <Gauge size={16} />
          <span className="text-xs">COMP</span>
        </Button>
        <Button
          variant="hardware"
          className="flex-1 gap-2 rounded-none"
          size="sm"
        >
          <Wand2 size={16} />
          <span className="text-xs">FX</span>
        </Button>
        <Button
          variant="hardware"
          className="flex-1 gap-2 rounded-none"
          size="sm"
        >
          <Volume2 size={16} />
          <span className="text-xs">LEVEL</span>
        </Button>
        <Button
          variant="hardware"
          className="flex-1 gap-2 rounded-l-none rounded-r-lg"
          size="sm"
        >
          <Sliders size={16} />
          <span className="text-xs">TEMPO</span>
        </Button>
      </div>
    </div>
  );
};
