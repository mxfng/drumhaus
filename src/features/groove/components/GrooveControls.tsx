import { ArrowLeft, ArrowRight } from "lucide-react";

import { TimingNudgeMeter } from "@/features/sequencer/components/TimingNudgeMeter";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { HardwareModule } from "@/shared/components/HardwareModule";
import { cn } from "@/shared/lib/utils";
import { Button, Label, Tooltip } from "@/shared/ui";

// Tooltip constants
const TOOLTIPS = {
  ACCENT_MODE: "Toggle accent mode",
  TIMING_NUDGE_LEFT: "Nudge timing left",
  TIMING_NUDGE_RIGHT: "Nudge timing right",
} as const;

export const GrooveControls = () => {
  const {
    pattern,
    mode,
    variation,
    nudgeTimingLeft,
    nudgeTimingRight,
    toggleAccentMode,
  } = usePatternStore();

  const accentMode = mode.type === "accent";
  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;

  const currentNudge =
    pattern.voices[voiceIndex]?.variations[variation]?.timingNudge ?? 0;
  const canNudgeLeft = currentNudge > -2 && mode.type === "voice";
  const canNudgeRight = currentNudge < 2 && mode.type === "voice";

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-2 place-items-center gap-x-2 gap-y-4">
        {/* Timing nudge */}
        <div className="col-span-2 mt-2 grid h-12 grid-cols-3 place-items-center gap-x-2 gap-y-4 sm:h-8">
          <Tooltip content={TOOLTIPS.TIMING_NUDGE_LEFT} side="bottom">
            <Button
              variant="hardwareIcon"
              size="icon"
              className="relative overflow-hidden"
              onClick={nudgeTimingLeft}
              disabled={!canNudgeLeft}
            >
              <ArrowLeft size={12} />
            </Button>
          </Tooltip>
          <div className="flex flex-col items-center justify-center gap-1">
            <Label className="flex items-center justify-center">nudge</Label>
            <TimingNudgeMeter timingNudge={currentNudge} />
          </div>

          <Tooltip content={TOOLTIPS.TIMING_NUDGE_RIGHT} side="bottom">
            <Button
              variant="hardwareIcon"
              size="icon"
              className="relative overflow-hidden"
              onClick={nudgeTimingRight}
              disabled={!canNudgeRight}
            >
              <ArrowRight size={12} />
            </Button>
          </Tooltip>
        </div>

        {/* Accent mode button */}
        <Tooltip content={TOOLTIPS.ACCENT_MODE}>
          <Button
            variant="hardware"
            className={cn(accentMode && "ring-primary ring-2")}
            onClick={toggleAccentMode}
          >
            <span
              className={cn(
                "rounded border px-1 transition-colors duration-200",
                accentMode
                  ? "border-primary text-primary"
                  : "border-foreground-muted group-hover:border-primary-muted border-dashed",
              )}
            >
              accent
            </span>
          </Button>
        </Tooltip>

        {/* dummy for now, maybe useful */}
        <Button variant="hardware" onClick={toggleAccentMode} disabled>
          <span className="rounded px-1 leading-3 transition-colors duration-200">
            acc bypass
          </span>
        </Button>

        {/* Empty space to balance layout */}
        <div className="h-12 w-full sm:h-8" />
      </div>
    </HardwareModule>
  );
};
