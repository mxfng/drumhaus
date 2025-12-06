import { useMemo, useRef, useState } from "react";
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
import { buttonActive } from "@/shared/lib/buttonActive";
import { clamp, cn } from "@/shared/lib/utils";
import { useLightNode } from "@/shared/lightshow";
import {
  Button,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui";

type TempoMode = "bpm" | "swing";

const TAP_TEMPO_TIMEOUT = 2000; // Reset after 2 seconds of no taps
const TAP_TEMPO_MIN_TAPS = 2; // Need at least 2 taps to calculate BPM

// Tooltip constants
const TOOLTIPS = {
  TAP_TEMPO: "Tap to set tempo",
  BPM: "Adjust the tempo",
  SWING: "Adjust the swing",
} as const;

export const TempoControls = () => {
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);
  const [mode, setMode] = useState<TempoMode>("bpm");
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);

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

  const handleTapTempo = () => {
    const now = Date.now();

    // Filter out taps older than the timeout
    const recentTaps = tapTimestamps.filter(
      (timestamp) => now - timestamp < TAP_TEMPO_TIMEOUT,
    );

    // Add the current tap
    const newTaps = [...recentTaps, now];
    setTapTimestamps(newTaps);

    // Need at least 2 taps to calculate BPM
    if (newTaps.length >= TAP_TEMPO_MIN_TAPS) {
      // Calculate intervals between consecutive taps
      const intervals: number[] = [];
      for (let i = 1; i < newTaps.length; i++) {
        intervals.push(newTaps[i] - newTaps[i - 1]);
      }

      // Average interval in milliseconds
      const avgInterval =
        intervals.reduce((sum, interval) => sum + interval, 0) /
        intervals.length;

      // Convert to BPM (60000ms = 1 minute)
      const calculatedBpm = 60000 / avgInterval;

      // Clamp to valid BPM range and round
      const clampedBpm = clamp(
        Math.round(calculatedBpm),
        TRANSPORT_BPM_RANGE[0],
        TRANSPORT_BPM_RANGE[1],
      );

      setBpm(clampedBpm);
    }
  };

  const bpmButtonRef = useRef<HTMLButtonElement>(null);
  const swingButtonRef = useRef<HTMLButtonElement>(null);
  const tapTempoButtonRef = useRef<HTMLButtonElement>(null);

  useLightNode(bpmButtonRef, {
    id: "bpm-button",
    group: "button",
  });

  useLightNode(swingButtonRef, {
    id: "swing-button",
    group: "button",
  });

  useLightNode(tapTempoButtonRef, {
    id: "tap-tempo-button",
    group: "button",
  });

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
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={bpmButtonRef}
              variant="hardware-icon"
              size="icon-sm"
              className={cn(
                "font-pixel text-[10px] tracking-wide uppercase",
                buttonActive(mode === "bpm"),
              )}
              onClick={() => setMode("bpm")}
            >
              <Timer />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.BPM}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={swingButtonRef}
              variant="hardware-icon"
              size="icon-sm"
              className={cn(
                "font-pixel text-[10px] tracking-wide uppercase",
                buttonActive(mode === "swing"),
              )}
              onClick={() => setMode("swing")}
            >
              <Music3 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.SWING}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={tapTempoButtonRef}
              variant="hardware-icon"
              size="icon-sm"
              className="font-pixel text-foreground-muted text-[10px] tracking-wide uppercase"
              onClick={handleTapTempo}
            >
              <ArrowDownToDot />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.TAP_TEMPO}</TooltipContent>
        </Tooltip>
        <Label className="text-[10px]">bpm</Label>
        <Label className="text-[10px]">swing</Label>
        <Label className="text-[10px]">tap</Label>
      </div>
    </div>
  );
};
