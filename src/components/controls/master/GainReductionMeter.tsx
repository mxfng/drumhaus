import { useEffect, useRef } from "react";

import { Tooltip } from "@/components/ui";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

const MAX_REDUCTION_DB = -20; // Maximum gain reduction to display

export const GainReductionMeter: React.FC = () => {
  const fillRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const updateMeter = () => {
      const reduction = useMasterChainStore.getState().reduction;

      // Convert reduction (negative dB) to percentage (0-100)
      const percentage = Math.min(
        100,
        Math.max(0, (reduction / MAX_REDUCTION_DB) * 100),
      );

      // Update DOM directly without triggering React re-render
      if (fillRef.current) {
        fillRef.current.style.height = `${percentage}%`;
      }

      if (textRef.current) {
        textRef.current.textContent =
          reduction < -0.1 ? `${reduction.toFixed(0)} dB` : "0 dB";
      }

      animationFrameId = requestAnimationFrame(updateMeter);
    };

    animationFrameId = requestAnimationFrame(updateMeter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

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
            ref={fillRef}
            className="bg-primary absolute top-0 right-0 left-0 rounded-[0_200px_0_200px] blur-xs transition-all duration-75"
            style={{ height: "0%" }}
          />
        </div>
        {/* dB readout */}
        <span
          ref={textRef}
          className="text-foreground-muted font-pixel text-[8px] tabular-nums"
        >
          0 dB
        </span>
      </div>
    </Tooltip>
  );
};
