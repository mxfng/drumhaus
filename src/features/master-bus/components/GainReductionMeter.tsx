import { useEffect, useRef } from "react";

import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { clamp } from "@/shared/lib/utils";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";
import { Tooltip } from "@/shared/ui";

const MAX_REDUCTION_DB = -20; // Maximum gain reduction to display

/**
 * Gain reduction meter for the master compressor.
 *
 * This could be turned into a generalized meter if we de-couple the store state from the UI.
 */
export const GainReductionMeter: React.FC = () => {
  const fillRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const frameInterval = potatoMode ? 1000 / 30 : 1000 / 60;
  const lastFrameRef = useRef(0);

  useEffect(() => {
    let animationFrameId: number;

    const updateMeter = (now: number) => {
      if (now - lastFrameRef.current < frameInterval) {
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }
      lastFrameRef.current = now;

      const reduction = useMasterChainStore.getState().reduction;

      // Convert reduction (negative dB) to percentage (0-100)
      const percentage = clamp((reduction / MAX_REDUCTION_DB) * 100, 0, 100);

      // Update DOM directly without triggering React re-render
      if (fillRef.current) {
        fillRef.current.style.height = `${percentage}%`;
        fillRef.current.classList.toggle("blur-xs", !potatoMode);
        fillRef.current.classList.toggle("transition-all", !potatoMode);
        fillRef.current.classList.toggle("duration-75", !potatoMode);
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
  }, [isPlaying, potatoMode, frameInterval]);

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
