import { useState } from "react";
import { ArrowDownToDot, Music3, Timer } from "lucide-react";

import { TRANSPORT_BPM_RANGE } from "@/core/audio/engine/constants";
import { historyGestureHandlers } from "@/features/preset/history/history";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { buttonActive } from "@/shared/lib/button-active";
import { clamp, cn } from "@/shared/lib/utils";
import {
  RotaryKnob,
  transportBpmDescriptor,
  transportSwingDescriptor,
} from "@/shared/param-control";
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

const TempoControls = () => {
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);
  const [mode, setMode] = useState<TempoMode>("bpm");
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([]);

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

  return (
    <div className="mx-auto flex w-5/6 flex-col items-center justify-center gap-4 px-4">
      {mode === "bpm" ? (
        <RotaryKnob
          {...historyGestureHandlers}
          descriptor={transportBpmDescriptor}
          value={bpm}
          onChange={setBpm}
          label="bpm"
          hideLabel
          outerTickCount={0}
          showTickIndicator={false}
        />
      ) : (
        <RotaryKnob
          {...historyGestureHandlers}
          descriptor={transportSwingDescriptor}
          value={swing}
          onChange={setSwing}
          label="swing"
          hideLabel
          outerTickCount={0}
          showTickIndicator={false}
        />
      )}
      <div className="grid grid-cols-3 place-items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
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

export { TempoControls };
