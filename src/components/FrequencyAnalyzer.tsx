import { useEffect, useRef } from "react";
import { Analyser } from "tone/build/esm/index";

import {
  createFrequencyAnalyzer,
  disposeFrequencyAnalyzer,
} from "@/lib/audio/engine";

const NUM_BARS = 128; // how many chunky bars
const PIXEL_SIZE = 2; // quantized height step (px)
const BAR_GAP = 2; // gap between bars (px)

const ACTIVE_FRACTION_X = 2 / 3; // use lowest 2/3 of spectrum
const ACTIVE_FRACTION_Y = 2 / 3; // zoom lowest 2/3 of amplitude to full height

// Logarithmic scaling factor - higher = more space for low frequencies
const LOG_SCALE_BASE = 10;

export function FrequencyAnalyzer() {
  const analyzerRef = useRef<Analyser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameId = useRef<number | null>(null);

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

      const dataArray = analyzer.getValue();
      const length = dataArray.length;

      // Only look at the lower ACTIVE_FRACTION_X of the spectrum
      const activeLength = Math.floor(length * ACTIVE_FRACTION_X);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Split canvas into NUM_BARS equal bands
      const bandWidth = canvas.width / NUM_BARS;
      const barWidth = Math.max(1, bandWidth - BAR_GAP); // keep at least 1px

      // Helper to map bar index to frequency bin using logarithmic scale
      // This gives more visual space to lower frequencies
      const logScale = (barIdx: number) => {
        const normalized = barIdx / NUM_BARS; // 0 to 1
        // Logarithmic mapping: more bins for low frequencies
        const logPos =
          (Math.pow(LOG_SCALE_BASE, normalized) - 1) / (LOG_SCALE_BASE - 1);
        return Math.floor(logPos * activeLength);
      };

      for (let barIndex = 0; barIndex < NUM_BARS; barIndex++) {
        const start = logScale(barIndex);
        let end = logScale(barIndex + 1);

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
        const normalized = Math.max(0, Math.min(1, (avg + 100) / 100));

        // Vertical zoom: treat bottom ACTIVE_FRACTION_Y as the whole visible range
        const boosted = Math.min(1, normalized / ACTIVE_FRACTION_Y);

        let barHeight = boosted * canvas.height;

        // Quantize height to pixel steps for “pixel” look
        const pixelsHigh = Math.round(barHeight / PIXEL_SIZE);
        barHeight = pixelsHigh * PIXEL_SIZE;

        const x = barIndex * bandWidth;
        const y = canvas.height - barHeight;

        ctx.fillStyle = "#ff7b00";
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      animationFrameId.current = requestAnimationFrame(drawFrame);
    };

    animationFrameId.current = requestAnimationFrame(drawFrame);

    return () => {
      if (animationFrameId.current !== null) {
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
      disposeFrequencyAnalyzer(analyzerRef);
    };
  }, []);

  return <canvas ref={canvasRef} width={550} height={88} />;
}

export default FrequencyAnalyzer;
