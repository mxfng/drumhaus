import { Speaker } from "lucide-react";

import { ParamKnob } from "@/shared/knob/Knob";
import { masterVolumeMapping } from "@/shared/knob/lib/mapping";
import { Button, Label } from "@/shared/ui";

export const TempoControls = () => {
  return (
    <div className="mx-auto flex w-5/6 flex-col items-center justify-center gap-4 px-4">
      <ParamKnob
        value={0}
        onValueChange={() => {}}
        label=""
        mapping={masterVolumeMapping}
      />
      <div className="grid grid-cols-3 place-items-center gap-2">
        <Button
          variant="hardwareIcon"
          size="icon"
          className="relative w-6 overflow-hidden"
        >
          <Speaker size={12} />
        </Button>

        <Button variant="hardwareIcon" size="icon">
          <Speaker size={12} />
        </Button>

        <Button variant="hardwareIcon" size="icon">
          <Speaker size={12} />
        </Button>
        <Label className="text-[10px]">tempo</Label>
        <Label className="text-[10px]">swing</Label>
        <Label className="text-[10px]">tap</Label>
      </div>
    </div>
  );
};
