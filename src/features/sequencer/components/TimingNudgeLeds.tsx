import { TIMING_NUDGE_LEVELS } from "@/features/sequencer/lib/timing";
import type { TimingNudge } from "@/features/sequencer/types/pattern";
import { cn } from "@/shared/lib/utils";

interface TimingNudgeLedsProps {
  timingNudge: TimingNudge | undefined;
  className?: string;
}

/**
 * 5-position LED indicator for timing nudge visualization.
 * Shows which nudge level is active: [-2, -1, 0, +1, +2]
 * Matches existing LED styles (GainMeter, SequencerVariationPreview).
 */
export const TimingNudgeLeds: React.FC<TimingNudgeLedsProps> = ({
  timingNudge,
  className,
}) => {
  const safeNudge = timingNudge ?? 0;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {TIMING_NUDGE_LEVELS.map((level) => {
        const isActive = level === safeNudge;
        return (
          <div
            key={level}
            className={cn(
              "h-1 w-1 rounded-full transition-all duration-150",
              isActive
                ? "bg-primary shadow-[0_0_4px_rgba(255,123,0,0.6)]"
                : "bg-border",
            )}
            aria-label={`Timing nudge level ${level}`}
          />
        );
      })}
    </div>
  );
};
