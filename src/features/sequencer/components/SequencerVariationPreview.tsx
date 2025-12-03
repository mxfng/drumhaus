import { cn } from "@/shared/lib/utils";
import { usePatternStore } from "../store/usePatternStore";

interface SequencerVariationPreviewProps {
  variation: number;
  className?: string;
}

const COLS = 16;

/**
 * Pattern preview for a specific variation.
 * Renders merged voice pairs (0+1, 2+3, 4+5, 6+7) as a 4x16 grid of dots.
 */
export const SequencerVariationPreview: React.FC<
  SequencerVariationPreviewProps
> = ({ variation, className }) => {
  const pattern = usePatternStore((state) => state.pattern);

  // Row 0: voices 6+7, Row 1: voices 4+5, Row 2: voices 2+3, Row 3: voices 0+1
  const voicePairs = [
    [6, 7],
    [4, 5],
    [2, 3],
    [0, 1],
  ];

  return (
    <div
      className={cn(
        "flex h-8 w-full flex-col items-center justify-center gap-1.5",
        className,
      )}
    >
      {voicePairs.map(([voice1, voice2], rowIdx) => (
        <div key={rowIdx} className="flex gap-1.5">
          {Array.from({ length: COLS }).map((_, stepIdx) => {
            const triggers1 =
              pattern.voices[voice1]?.variations[variation]?.triggers || [];
            const triggers2 =
              pattern.voices[voice2]?.variations[variation]?.triggers || [];

            // Merge: trigger is on if EITHER voice has it active
            const isTriggerOn = triggers1[stepIdx] || triggers2[stepIdx];

            return (
              <div
                key={stepIdx}
                className={cn(
                  "h-1 w-1 rounded-full",
                  isTriggerOn
                    ? "bg-primary shadow-[0_0_4px_rgba(255,123,0,0.6)]"
                    : "bg-border",
                )}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
};
