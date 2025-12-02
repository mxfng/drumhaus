import { useEffect, useRef } from "react";
import { Meter } from "tone";

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
    "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.6)]", // Dot 3
    "bg-yellow-500 shadow-[0_0_4px_rgba(234,179,8,0.6)]", // Dot 4
    "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.6)]", // Dot 5
  ],
  inactive: ["bg-border", "bg-border", "bg-border", "bg-border", "bg-border"],
};

export const GainMeter: React.FC<GainMeterProps> = ({ runtime }) => {
  const dotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const meterRef = useRef<Meter | null>(null);
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const frameInterval = potatoMode ? 1000 / 30 : 1000 / 60;
  const lastFrameRef = useRef(0);
  const peakLevelRef = useRef(0);
  const peakHoldTimeRef = useRef(0);
  const PEAK_HOLD_MS = 100; // Hold peaks for 100ms
  const PEAK_DECAY_RATE = 0.95; // How fast peaks decay after hold time

  // Create our own meter and tap the instrument output
  useEffect(() => {
    if (!runtime) return;

    // Create meter and tap the panner output (just like FrequencyAnalyzer taps Destination)
    meterRef.current = new Meter({
      normalRange: true,
      smoothing: 0.8,
    });
    runtime.pannerNode.connect(meterRef.current);

    return () => {
      if (meterRef.current) {
        try {
          // Just dispose the meter - it will handle disconnection internally
          meterRef.current.dispose();
        } catch (e) {
          console.warn("Error disposing meter:", e);
        }
        meterRef.current = null;
      }
    };
  }, [runtime]);

  useEffect(() => {
    if (!runtime || !meterRef.current) return;

    let animationFrameId: number;

    const updateMeter = (now: number) => {
      if (now - lastFrameRef.current < frameInterval) {
        animationFrameId = requestAnimationFrame(updateMeter);
        return;
      }
      lastFrameRef.current = now;

      if (!meterRef.current) return;

      // Get level from meter (0-1 range due to normalRange)
      const rawValue = meterRef.current.getValue();
      const meterValue = Array.isArray(rawValue)
        ? Math.max(...rawValue)
        : (rawValue as number);

      // Ensure the value is usable (avoid -Infinity/NaN)
      const safeValue = Number.isFinite(meterValue) ? meterValue : 0;

      // Peak detection with hold (important for brief drum hits!)
      if (safeValue > peakLevelRef.current) {
        peakLevelRef.current = safeValue;
        peakHoldTimeRef.current = now;
      } else if (now - peakHoldTimeRef.current > PEAK_HOLD_MS) {
        peakLevelRef.current *= PEAK_DECAY_RATE;
      }

      // Noise gate - ignore very quiet signals (below ~-60dB in normalized range)
      const gatedLevel =
        peakLevelRef.current < 0.001 ? 0 : peakLevelRef.current;

      // Apply scaling to make the meter more sensitive to actual hits
      // This spreads the useful range (0.1-1.0) across all 5 dots
      const normalized = clamp(gatedLevel * 1.5, 0, 1);

      // Calculate how many dots should be lit
      const activeDots = Math.ceil(normalized * DOT_COUNT);

      // Update each dot's appearance
      dotRefs.current.forEach((dot, index) => {
        if (!dot) return;

        const isActive = index < activeDots;
        const activeClass = DOT_COLORS.active[index];
        const inactiveClass = DOT_COLORS.inactive[index];

        // Remove all color classes first
        dot.className = "h-1 w-1 rounded-full transition-all duration-100";

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
          className={`h-1 w-1 rounded-full transition-all duration-100 ${DOT_COLORS.inactive[index]}`}
        />
      ))}
    </div>
  );
};
