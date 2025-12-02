import { useMemo, useState } from "react";
import { ArrowDownToDot, Music3, Timer } from "lucide-react";

import {
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_RANGE,
} from "@/core/audio/engine/constants";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  transportBpmMapping,
  transportSwingMapping,
} from "@/shared/knob/lib/mapping";
import { clamp, cn } from "@/shared/lib/utils";
import { Button, Label } from "@/shared/ui";

type TempoMode = "bpm" | "swing";

export const TempoControls = () => {
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);
  const [mode, setMode] = useState<TempoMode>("bpm");

  const { mapping, value } = useMemo(() => {
    if (mode === "bpm") {
      return {
        mapping: transportBpmMapping,
        value: bpm,
      };
    }

    return {
      mapping: transportSwingMapping,
      value: swing,
    };
  }, [mode, bpm, swing]);

  const knobValue = mapping.domainToKnob(value);

  const handleKnobChange = (newKnobValue: number) => {
    const domainValue = mapping.knobToDomain(newKnobValue);

    if (mode === "bpm") {
      const clamped = clamp(
        Math.round(domainValue),
        TRANSPORT_BPM_RANGE[0],
        TRANSPORT_BPM_RANGE[1],
      );
      setBpm(clamped);
      return;
    }

    const clamped = clamp(
      Math.round(domainValue),
      TRANSPORT_SWING_RANGE[0],
      TRANSPORT_SWING_RANGE[1],
    );
    setSwing(clamped);
  };

  return (
    <div className="mx-auto flex w-5/6 flex-col items-center justify-center gap-4 px-4">
      <ParamKnob
        value={knobValue}
        onValueChange={handleKnobChange}
        label=""
        mapping={mapping}
        outerTickCount={0}
        showTickIndicator={false}
      />
      <div className="grid grid-cols-3 place-items-center gap-2">
        <Button
          variant="hardwareIcon"
          size="icon"
          className={cn(
            "font-pixel text-[10px] tracking-wide uppercase",
            mode === "bpm" && "text-primary ring-primary ring-1",
          )}
          onClick={() => setMode("bpm")}
        >
          <Timer />
        </Button>

        <Button
          variant="hardwareIcon"
          size="icon"
          className={cn(
            "font-pixel text-[10px] tracking-wide uppercase",
            mode === "swing" && "text-primary ring-primary ring-1",
          )}
          onClick={() => setMode("swing")}
        >
          <Music3 />
        </Button>

        <Button
          variant="hardwareIcon"
          size="icon"
          className="font-pixel text-foreground-muted text-[10px] tracking-wide uppercase"
        >
          <ArrowDownToDot />
        </Button>
        <Label className="text-[10px]">bpm</Label>
        <Label className="text-[10px]">swing</Label>
        <Label className="text-[10px]">tap</Label>
      </div>
    </div>
  );
};
