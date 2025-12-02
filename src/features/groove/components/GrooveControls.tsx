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
    <div className="mx-auto w-5/6 px-4">
      <HardwareModule>
        <div className="grid grid-cols-3 place-items-center gap-x-2 gap-y-4">
          {/* Accent mode button */}
          <div className="col-span-3 mx-auto">
            <Tooltip content={TOOLTIPS.ACCENT_MODE}>
              <Button
                variant="hardware"
                className={cn(
                  "relative overflow-hidden",
                  accentMode && "ring-primary ring-2",
                )}
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
          </div>

          {/* Timing nudge */}
          <div className="col-span-3 mt-2 flex items-center justify-center">
            <TimingNudgeMeter timingNudge={currentNudge} />
          </div>
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
          <Label className="flex items-center justify-center">nudge</Label>
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
      </HardwareModule>
    </div>
  );
};
