import { useEffect, useRef, useState } from "react";
import { Analyser } from "tone";

import {
  createFrequencyAnalyzer,
  disposeFrequencyAnalyzer,
} from "@/core/audio/engine";
import { subscribeToPlaybackAnimation } from "@/core/audio/lib/playbackAnimationManager";
import { semitonesToRatio } from "@/shared/knob/lib/utils";
import { clamp, normalize } from "@/shared/lib/utils";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";

const NUM_BARS = 128; // how many chunky bars
const PIXEL_SIZE = 2; // quantized height step (px)

const ACTIVE_FRACTION_X = 2 / 3; // use lowest 2/3 of spectrum
const ACTIVE_FRACTION_Y = 2 / 3; // zoom lowest 2/3 of amplitude to full height

// Musical octaves to display (drums have lots of low-end)
const NUM_OCTAVES = 6;

interface FrequencyAnalyzerProps {
  width?: number;
  height?: number;
  numBars?: number;
}

export function FrequencyAnalyzer({
  width,
  height,
  numBars = NUM_BARS,
}: FrequencyAnalyzerProps = {}) {
  const analyzerRef = useRef<Analyser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);
  const [dimensions, setDimensions] = useState({
    width: width || 550,
    height: height || 90,
  });

  // Measure container size on mount and resize
  useEffect(() => {
    if (!width || !height) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const { width: containerWidth, height: containerHeight } =
            containerRef.current.getBoundingClientRect();
          setDimensions({
            width: Math.floor(containerWidth),
            height: Math.floor(containerHeight),
          });
        }
      };

      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [width, height]);

  useEffect(() => {
    createFrequencyAnalyzer(analyzerRef);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");

    if (!canvas || !ctx) {
      console.error("Canvas or context not available.");
      return () => {
        disposeFrequencyAnalyzer(analyzerRef);
      };
    }

    const drawFrame = () => {
      const analyzer = analyzerRef.current;
      if (!analyzer) return;

      const effectiveBars = potatoMode ? Math.min(numBars, 64) : numBars;
      const dataArray = analyzer.getValue();
      const length = dataArray.length;

      // Only look at the lower ACTIVE_FRACTION_X of the spectrum
      const activeLength = Math.floor(length * ACTIVE_FRACTION_X);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Split canvas into NUM_BARS bars with equal bar/gap width
      const totalUnits = effectiveBars * 2 - 1; // bar + gap per bucket except last
      const unitWidth = canvas.width / totalUnits;
      const barWidth = unitWidth;
      const gapWidth = unitWidth;
      const stride = barWidth + gapWidth;

      // Map bar index to frequency bin using musical intervals
      // Gives equal visual space to each octave (good for drums)
      const mapBarToFrequencyBin = (barIdx: number) => {
        const normalized = normalize(barIdx, 0, effectiveBars);
        const semitones = normalized * (NUM_OCTAVES * 12);
        const ratio = semitonesToRatio(semitones);
        const maxRatio = Math.pow(2, NUM_OCTAVES);
        return Math.floor((ratio / maxRatio) * activeLength);
      };

      for (let barIndex = 0; barIndex < effectiveBars; barIndex++) {
        const start = mapBarToFrequencyBin(barIndex);
        let end = mapBarToFrequencyBin(barIndex + 1);

        // Ensure each bar covers at least one bin to prevent duplicates
        if (end <= start) {
          end = start + 1;
        }

        let sum = 0;
        let count = 0;

        for (let i = start; i < end && i < activeLength; i++) {
          const value = Number(dataArray[i]) || 0;
          sum += value;
          count++;
        }

        const avg = count > 0 ? sum / count : 0;

        // Normalize dB-ish [-100, 0] → [0, 1]
        const normalized = clamp(normalize(avg, -100, 0), 0, 1);

        // Vertical zoom: treat bottom ACTIVE_FRACTION_Y as the whole visible range
        const boosted = Math.min(1, normalized / ACTIVE_FRACTION_Y);

        let barHeight = boosted * canvas.height;

        // Quantize height to pixel steps for "pixel" look
        const pixelsHigh = Math.round(barHeight / PIXEL_SIZE);
        barHeight = pixelsHigh * PIXEL_SIZE;

        const x = barIndex * stride;
        const y = canvas.height - barHeight;

        ctx.fillStyle = "#ff7b00";
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    // Subscribe to playback animation (only runs when playing)
    const unsubscribe = subscribeToPlaybackAnimation(drawFrame);

    return () => {
      unsubscribe();
      disposeFrequencyAnalyzer(analyzerRef);
    };
  }, [numBars, potatoMode]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="h-full w-full"
      />
    </div>
  );
}

export default FrequencyAnalyzer;
