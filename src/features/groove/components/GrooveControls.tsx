import { ArrowLeft, ArrowRight } from "lucide-react";

import { TimingNudgeMeter } from "@/features/groove/components/TimingNudgeMeter";
import { useGrooveStore } from "@/features/groove/store/useGrooveStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { HardwareModule } from "@/shared/components/HardwareModule";
import { cn } from "@/shared/lib/utils";
import { Button, Label, Tooltip } from "@/shared/ui";

// Tooltip constants
const TOOLTIPS = {
  ACCENT_MODE: "Toggle accent mode",
  SHOW_VELOCITY: "Toggle velocity controls visibility",
  TIMING_NUDGE_LEFT: "Nudge timing left",
  TIMING_NUDGE_RIGHT: "Nudge timing right",
} as const;

/**
 * Work in progress
 * TODO: Add the remaining features
 *
 * Flam — “Human grace-note before the main hit.”
 * A flam adds a quiet pre-hit just before the step, giving snares, claps, and percussion a natural, human feel. It mimics the way a drummer strikes slightly early with one stick, creating expressive accents and groove variation.
 *
 * Ratchet — “Fast extra hit after the step.”
 * Ratchet adds a rapid second hit after the main step (1/32 subdivision), increasing rhythmic density. Perfect for techno hats, rolling snares, and energetic electronic fills.
 */

export const GrooveControls = () => {
  const pattern = usePatternStore((state) => state.pattern);
  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);
  const nudgeTimingLeft = usePatternStore((state) => state.nudgeTimingLeft);
  const nudgeTimingRight = usePatternStore((state) => state.nudgeTimingRight);
  const toggleAccentMode = usePatternStore((state) => state.toggleAccentMode);

  const showVelocity = useGrooveStore((state) => state.showVelocity);
  const toggleShowVelocity = useGrooveStore(
    (state) => state.toggleShowVelocity,
  );

  const accentMode = mode.type === "accent";
  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;

  const currentNudge =
    pattern.voices[voiceIndex]?.variations[variation]?.timingNudge ?? 0;
  const canNudgeLeft = currentNudge > -2 && mode.type === "voice";
  const canNudgeRight = currentNudge < 2 && mode.type === "voice";

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-2 place-items-center gap-x-2 gap-y-4">
        {/* Accent mode button */}
        <Tooltip content={TOOLTIPS.ACCENT_MODE}>
          <Button
            variant="hardware"
            className={cn(accentMode && "border-primary transition-colors")}
            onClick={toggleAccentMode}
            size="sm"
          >
            <span className={cn(accentMode && "text-primary")}>accent</span>
          </Button>
        </Tooltip>
        {/* Show velocity toggle */}
        <Tooltip content={TOOLTIPS.SHOW_VELOCITY}>
          <Button
            variant="hardware"
            size="sm"
            className={cn(
              "leading-3",
              showVelocity && "border-primary transition-colors",
            )}
            onClick={toggleShowVelocity}
          >
            <span className={cn(showVelocity && "text-primary")}>velocity</span>
          </Button>
        </Tooltip>

        {/* Timing nudge */}
        <div className="border-border surface-raised col-span-2 grid h-12 grid-cols-3 place-items-center gap-x-2 gap-y-4 rounded-lg border">
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
          <div className="flex flex-col items-center justify-center gap-1.5">
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

        <Button variant="hardware" size="sm">
          ratchet
        </Button>
        <Button variant="hardware" size="sm">
          flam
        </Button>
      </div>
    </HardwareModule>
  );
};
