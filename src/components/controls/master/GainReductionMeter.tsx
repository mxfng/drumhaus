import { Tooltip } from "@/components/ui";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

const MAX_REDUCTION_DB = -20; // Maximum gain reduction to display

export const GainReductionMeter: React.FC = () => {
  const reduction = useMasterChainStore((state) => state.reduction);

  // Convert reduction (negative dB) to percentage (0-100)
  // reduction of 0 = 0%, reduction of -20 = 100%
  const percentage = Math.min(
    100,
    Math.max(0, (reduction / MAX_REDUCTION_DB) * 100),
  );

  return (
    <Tooltip content="Gain reduction in dB" side="top">
      <div className="flex h-full w-full flex-col items-center gap-1">
        {/* Track container with primary outline matching velocity input style */}
        <div
          className="outline-primary relative w-5 flex-1 overflow-hidden rounded-[0_200px_0_200px] bg-transparent outline-1"
          style={{ opacity: 0.6 }}
        >
          {/* Glowing fill - grows from top down */}
          <div
            className="bg-primary absolute top-0 right-0 left-0 rounded-[0_200px_0_200px] blur-xs transition-all duration-75"
            style={{ height: `${percentage}%` }}
          />
        </div>
        {/* dB readout */}
        <span className="text-foreground-muted font-pixel text-[8px] tabular-nums">
          {reduction < -0.1 ? reduction.toFixed(0) : "0"} dB
        </span>
      </div>
    </Tooltip>
  );
};
