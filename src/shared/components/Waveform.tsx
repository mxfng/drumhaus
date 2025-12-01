import React, { useEffect, useRef, useState } from "react";

import { getCachedWaveform, TransientWaveformData } from "@/core/audio/cache";
import { WAVEFORM_VALUE_SCALE } from "@/core/audio/cache/constants";

interface WaveformProps {
  audioFile: string;
  width?: number;
  height?: number;
  color?: string;
  onError?: (error: Error) => void;
}

const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  height,
  color = "#ff7b00", // must be hardcoded due to canvas
  onError,
}) => {
  // Derive waveform key by stripping /samples/ prefix and extension, but keep subfolders
  const normalizedPath = audioFile
    .replace(/^\/+/, "")
    .replace(/^samples\//, "");
  const sampleFilename = normalizedPath.replace(/\.[^.]+$/, "");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-sizing: observe container dimensions if width/height not provided
  const [autoWidth, setAutoWidth] = useState<number>(170);
  const [autoHeight, setAutoHeight] = useState<number>(60);

  const finalWidth = width ?? autoWidth;
  const finalHeight = height ?? autoHeight;

  // Auto-sizing with ResizeObserver
  useEffect(() => {
    if (width !== undefined && height !== undefined) {
      // If both dimensions are provided, skip auto-sizing
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: containerWidth, height: containerHeight } =
          entry.contentRect;

        if (width === undefined) {
          // Use full container width (container already accounts for parent padding)
          setAutoWidth(Math.max(containerWidth, 100));
        }
        if (height === undefined) {
          // Use container height or default to 60
          setAutoHeight(Math.max(containerHeight || 60, 30));
        }
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  useEffect(() => {
    const draw = (
      waveform: TransientWaveformData,
      ctx: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number,
    ) => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.imageSmoothingEnabled = false;

      const { buckets } = waveform;
      if (!buckets.length) return;

      const centerY = canvasHeight / 2;
      const maxHeight = Math.max(1, centerY - 1);

      // Keep bars and gaps the same pixel width regardless of bucket count
      const totalUnits = buckets.length * 2 - 1; // bar + gap per bucket except last
      const unitWidth = canvasWidth / totalUnits; // use exact division to span full width
      const barWidth = unitWidth;
      const gapWidth = unitWidth;
      const stride = barWidth + gapWidth;

      ctx.fillStyle = color;

      for (let i = 0; i < buckets.length; i++) {
        const normalized =
          Math.max(0, Math.min(WAVEFORM_VALUE_SCALE, buckets[i])) /
          WAVEFORM_VALUE_SCALE;
        const barHeight = Math.max(1, Math.round(normalized * maxHeight));
        const x = i * stride;

        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
      }
    };

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    if (!canvas || !ctx) {
      return;
    }

    canvas.width = Math.max(1, Math.floor(finalWidth));
    canvas.height = Math.max(1, Math.floor(finalHeight));

    // Load waveform data using Cache API
    getCachedWaveform(sampleFilename)
      .then((data) => {
        draw(data, ctx, canvas.width, canvas.height);
      })
      .catch((error) => {
        console.error(`Failed to load waveform for ${sampleFilename}`, error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
  }, [sampleFilename, finalWidth, finalHeight, color, onError]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
    </div>
  );
};

export default Waveform;
