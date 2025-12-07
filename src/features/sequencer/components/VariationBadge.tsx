import { VARIATION_CHAIN_COLORS } from "@/features/sequencer/lib/colors";
import {
  VARIATION_LABELS,
  VariationId,
} from "@/features/sequencer/types/sequencer";
import { cn } from "@/shared/lib/utils";

type VariationBadgeProps = {
  variation: VariationId;
  className?: string;
  size?: "sm" | "md";
  repeats?: number;
  children?: React.ReactNode;
};

export const VariationBadge: React.FC<VariationBadgeProps> = ({
  variation,
  className,
  size = "sm",
  repeats,
}) => {
  const colors = VARIATION_CHAIN_COLORS[variation];

  if (size === "md") {
    return (
      <div
        className={cn(
          "font-pixel flex items-center justify-center gap-1 rounded-tr rounded-bl border px-1 text-xs",
          colors.bg,
          colors.border,
          colors.text,
          className,
        )}
      >
        <span className="font-semibold uppercase">
          {VARIATION_LABELS[variation]}
        </span>
        {repeats && repeats > 1 && (
          <span className="text-xs opacity-70">×{repeats}</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "font-pixel bg-screen relative flex h-3 min-w-3 items-center justify-center overflow-hidden rounded-tr rounded-bl border px-1 text-xs leading-none",
        colors.border,
        colors.text,
        className,
      )}
    >
      <div
        className={cn("absolute inset-0 rounded-tr rounded-bl", colors.bg)}
      />
      <span className="relative flex w-full items-center justify-center">
        {VARIATION_LABELS[variation]}
      </span>
    </div>
  );
};
