import { useEffect, useRef } from "react";

import { InstrumentRuntime } from "@/features/instrument/types/instrument";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { clamp } from "@/shared/lib/utils";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";

interface GainMeterProps {
  runtime?: InstrumentRuntime;
}

const DOT_COUNT = 5;

// Color classes for each dot level
const DOT_COLORS = {
  active: [
    "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]", // Dot 1
    "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]", // Dot 2
    "bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)]", // Dot 3
    "bg-orange-500 shadow-[0_0_4px_rgba(249,115,22,0.6)]", // Dot 4
    "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]", // Dot 5
  ],
  inactive: [
    "bg-green-500/20",
    "bg-green-500/20",
    "bg-yellow-500/20",
    "bg-orange-500/20",
    "bg-red-500/20",
  ],
};

export const GainMeter: React.FC<GainMeterProps> = ({ runtime }) => {
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const frameInterval = potatoMode ? 1000 / 30 : 1000 / 60;
  const lastFrameRef = useRef(0);

  useEffect(() => {
    if (!runtime) return;

    let animationFrameId: number;

    const updateMeter = (now: number) => {
      if (now - lastFrameRef.current < frameInterval) {
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }
      lastFrameRef.current = now;

      // Get current level from meter (0–1 range because normalRange is enabled)
      const rawValue = runtime.meterNode.getValue();

      // Debug: Log meter values occasionally
      if (Math.random() < 0.01) {
        console.log(
          `[GainMeter] Raw value:`,
          rawValue,
          `Type: ${typeof rawValue}`,
        );
      }

      // Handle if getValue returns an array (stereo) - take the max
      const meterValue = Array.isArray(rawValue)
        ? Math.max(...rawValue)
        : (rawValue as number);

      // Ensure the value is usable (avoid -Infinity/NaN)
      const safeValue = Number.isFinite(meterValue) ? meterValue : 0;
      const normalized = clamp(safeValue, 0, 1);

      // Calculate how many dots should be lit
      const activeDots = Math.ceil(normalized * DOT_COUNT);

      // Update each dot's appearance
      dotRefs.current.forEach((dot, index) => {
        if (!dot) return;

        const isActive = index < activeDots;
        const activeClass = DOT_COLORS.active[index];
        const inactiveClass = DOT_COLORS.inactive[index];

        // Remove all color classes first
        dot.className = "h-2 w-2 rounded-full transition-all duration-100";

        // Add the appropriate color class
        dot.classList.add(
          ...(isActive ? activeClass : inactiveClass).split(" "),
        );
      });

      animationFrameId = requestAnimationFrame(updateMeter);
    };

    animationFrameId = requestAnimationFrame(updateMeter);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [runtime, isPlaying, potatoMode, frameInterval]);

  return (
    <div className="flex h-full flex-col-reverse items-center justify-center gap-1.5">
      {Array.from({ length: DOT_COUNT }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            dotRefs.current[index] = el;
          }}
          className={`h-2 w-2 rounded-full transition-all duration-100 ${DOT_COLORS.inactive[index]}`}
        />
      ))}
    </div>
  );
};
