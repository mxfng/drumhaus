import { useMemo } from "react";

import { StepSequence } from "@/features/sequencer/types/pattern";
import { cn } from "@/shared/lib/utils";

type ClipboardVariationPreviewProps = {
  voices: StepSequence[];
  className?: string;
};

type CloudPoint = {
  isOn: boolean;
};

/**
 * Screen-friendly variation preview used in the clipboard screen.
 * Shows 8 ultra-condensed lanes of 16 steps (triggers only) in a micro-grid.
 */
export const ClipboardVariationPreview: React.FC<
  ClipboardVariationPreviewProps
> = ({ voices, className }) => {
  const { rows, stepCount } = useMemo(() => {
    const resolvedStepCount = voices[0]?.triggers.length ?? 16;
    const resolvedRowCount = Math.min(voices.length || 0, 8);
    if (!resolvedRowCount || !resolvedStepCount) {
      return { rows: [] as CloudPoint[][], stepCount: 0 };
    }

    const grid: CloudPoint[][] = Array.from(
      { length: resolvedRowCount },
      (_, rowIdx) => {
        const triggers = voices[rowIdx]?.triggers ?? [];
        return Array.from({ length: resolvedStepCount }, (_, stepIdx) => ({
          isOn: Boolean(triggers[stepIdx]),
        }));
      },
    );

    return { rows: grid, stepCount: resolvedStepCount };
  }, [voices]);

  if (!rows.length) return null;

  return (
    <div
      className={cn(
        "text-screen relative h-8 w-full overflow-hidden py-1",
        className,
      )}
    >
      <div
        className="grid h-full w-full gap-px"
        style={{
          gridTemplateColumns: `repeat(${stepCount}, minmax(0, 1fr))`,
        }}
      >
        {rows.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const isOn = cell.isOn;
            return (
              <div
                key={`${rowIdx}-${colIdx}`}
                className={cn(
                  "h-px transition-none",
                  isOn ? "bg-primary" : "bg-shadow-30",
                )}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};
