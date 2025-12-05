import { ArrowLeft, ArrowRight } from "lucide-react";

import { TimingNudgeMeter } from "@/features/groove/components/TimingNudgeMeter";
import { useGrooveStore } from "@/features/groove/store/useGrooveStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { HardwareModule } from "@/shared/components/HardwareModule";
import { buttonActive } from "@/shared/lib/buttonActive";
import { cn } from "@/shared/lib/utils";
import {
  Button,
  Label,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/ui";

// Tooltip constants
const TOOLTIPS = {
  ACCENT_MODE: "Toggle accent mode (pronounced hits)",
  SHOW_VELOCITY: "Show or hide velocity controls",
  TIMING_NUDGE_LEFT: "Shift timing earlier",
  TIMING_NUDGE_RIGHT: "Shift timing later",
  RATCHET_MODE: "Toggle ratchet mode (extra rapid hits)",
  FLAM_MODE: "Toggle flam mode (a quick pre-hit)",
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

  const toggleFlamMode = usePatternStore((state) => state.toggleFlamMode);
  const toggleRatchetMode = usePatternStore((state) => state.toggleRatchetMode);

  const showVelocity = useGrooveStore((state) => state.showVelocity);
  const toggleShowVelocity = useGrooveStore(
    (state) => state.toggleShowVelocity,
  );

  const accentMode = mode.type === "accent";
  const flamMode = mode.type === "flam";
  const ratchetMode = mode.type === "ratchet";
  const voiceMode = mode.type === "voice";
  const voiceIndex = voiceMode ? mode.voiceIndex : 0;

  const currentNudge =
    pattern.voices[voiceIndex]?.variations[variation]?.timingNudge ?? 0;
  const canNudgeLeft = currentNudge > -2 && mode.type === "voice";
  const canNudgeRight = currentNudge < 2 && mode.type === "voice";

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-2 place-items-center gap-x-2 gap-y-4">
        {/* Accent mode button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              className={buttonActive(accentMode)}
              onClick={toggleAccentMode}
              size="sm"
            >
              accent
            </Button>
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.ACCENT_MODE}</TooltipContent>
        </Tooltip>
        {/* Show velocity toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              className={cn(
                "leading-3",
                buttonActive(voiceMode && showVelocity),
              )}
              onClick={toggleShowVelocity}
              disabled={mode.type !== "voice"}
            >
              velocity
            </Button>
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.SHOW_VELOCITY}</TooltipContent>
        </Tooltip>

        {/* Timing nudge */}
        <div
          aria-disabled={!canNudgeLeft || !canNudgeRight}
          className="surface-raised col-span-2 grid h-12 grid-cols-3 place-items-center gap-x-2 gap-y-4 rounded-lg border aria-disabled:opacity-50"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="hardware-icon"
                size="icon-sm"
                className="relative overflow-hidden"
                onClick={nudgeTimingLeft}
                disabled={!canNudgeLeft}
              >
                <ArrowLeft size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              {TOOLTIPS.TIMING_NUDGE_LEFT}
            </TooltipContent>
          </Tooltip>
          <div className="flex flex-col items-center justify-center gap-1.5">
            <Label className="flex items-center justify-center">nudge</Label>
            <TimingNudgeMeter timingNudge={currentNudge} />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="hardware-icon"
                size="icon-sm"
                className="relative overflow-hidden"
                onClick={nudgeTimingRight}
                disabled={!canNudgeRight}
              >
                <ArrowRight size={12} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {TOOLTIPS.TIMING_NUDGE_RIGHT}
            </TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              onClick={toggleRatchetMode}
              className={buttonActive(ratchetMode)}
            >
              ratchet
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{TOOLTIPS.RATCHET_MODE}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              onClick={toggleFlamMode}
              className={buttonActive(flamMode)}
            >
              flam
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{TOOLTIPS.FLAM_MODE}</TooltipContent>
        </Tooltip>
      </div>
    </HardwareModule>
  );
};
