import { useMemo, useRef } from "react";

import { cn } from "@/shared/lib/utils";
import { useLightNode, useLightRig } from "@/shared/lightshow";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";
import { usePatternStore } from "../store/usePatternStore";

interface SequencerVariationPreviewProps {
  variation: number;
  className?: string;
}

const COLS = 16;

type ColumnState = boolean[];

const VOICE_PAIRS: Array<[number, number]> = [
  [6, 7],
  [4, 5],
  [2, 3],
  [0, 1],
];

const VariationPreviewColumn: React.FC<{
  rows: ColumnState;
  isIntroPlaying: boolean;
}> = ({ rows, isIntroPlaying }) => {
  const columnRef = useRef<HTMLDivElement>(null);

  useLightNode(columnRef, {
    group: "variation-preview",
    weight: 0.5,
  });

  const showPattern = !isIntroPlaying;

  return (
    <div ref={columnRef} className="flex flex-col gap-1.5">
      {rows.map((isTriggerOn, rowIdx) => (
        <div
          key={rowIdx}
          className={cn(
            "preview-led h-1 w-1 rounded-full",
            showPattern && isTriggerOn
              ? "bg-primary shadow-[0_0_4px_var(--color-primary-shadow)]"
              : "bg-border",
          )}
        />
      ))}
    </div>
  );
};

/**
 * Pattern preview for a specific variation.
 * Renders merged voice pairs (0+1, 2+3, 4+5, 6+7) as a 4x16 grid of dots.
 * During the intro lightshow, each column is treated as a single light node:
 * the pattern LEDs default off and light up together per column.
 */
export const SequencerVariationPreview: React.FC<
  SequencerVariationPreviewProps
> = ({ variation, className }) => {
  const pattern = usePatternStore((state) => state.pattern);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const { isIntroPlaying } = useLightRig();

  const columns: ColumnState[] = useMemo(() => {
    return Array.from({ length: COLS }, (_, stepIdx) =>
      VOICE_PAIRS.map(([voice1, voice2]) => {
        const triggers1 =
          pattern.voices[voice1]?.variations[variation]?.triggers || [];
        const triggers2 =
          pattern.voices[voice2]?.variations[variation]?.triggers || [];

        return Boolean(triggers1[stepIdx] || triggers2[stepIdx]);
      }),
    );
  }, [pattern, variation]);

  if (potatoMode) {
    return <div className="h-10 w-full" />;
  }

  return (
    <div
      className={cn(
        "flex h-10 w-full flex-row items-center justify-center gap-1.5",
        className,
      )}
    >
      {columns.map((rows, colIdx) => (
        <VariationPreviewColumn
          key={colIdx}
          rows={rows}
          isIntroPlaying={isIntroPlaying}
        />
      ))}
    </div>
  );
};
