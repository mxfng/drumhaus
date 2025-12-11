import { useCallback, useEffect, useRef, useState } from "react";

import { TransientWaveformData } from "@/core/audio/cache";
import { WAVEFORM_VALUE_SCALE } from "@/core/audio/cache/constants";
import { PixelatedFrowny } from "@/shared/components/PixelatedFrowny";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import { cn } from "@/shared/lib/utils";
import { useWaveformData } from "./useWaveformData";

interface WaveformProps {
  audioFile: string;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  /** Manual override to loading state - keep spinner visible even if waveform data is already loaded (e.g. external runtime pending). */
  isLoading?: boolean;
}

const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  height,
  color = "#ff7b00", // must be hardcoded due to canvas
  className,
  isLoading: isLoadingExternal = false,
}) => {
  // Get waveform data from provider (automatically normalized and cached)
  const {
    data: waveformData,
    isLoading,
    error: loadError,
  } = useWaveformData(audioFile);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Auto-sizing: observe container dimensions if width/height not provided
  const [autoWidth, setAutoWidth] = useState<number>(170);
  const [autoHeight, setAutoHeight] = useState<number>(60);

  const finalWidth = width ?? autoWidth;
  const finalHeight = height ?? autoHeight;

  const drawWaveform = useCallback(
    (
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

      ctx.fillStyle = "#ff7b00"; // hardcoded due to canvas limitations

      for (let i = 0; i < buckets.length; i++) {
        const normalized =
          Math.max(0, Math.min(WAVEFORM_VALUE_SCALE, buckets[i])) /
          WAVEFORM_VALUE_SCALE;
        const barHeight = Math.max(1, Math.round(normalized * maxHeight));
        const x = i * stride;

        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight * 2);
      }
    },
    [],
  );

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
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !waveformData || loadError) {
      return;
    }

    const canvasWidth = Math.max(1, Math.floor(finalWidth));
    const canvasHeight = Math.max(1, Math.floor(finalHeight));

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    drawWaveform(waveformData, ctx, canvasWidth, canvasHeight);
  }, [waveformData, finalWidth, finalHeight, drawWaveform, loadError]);

  const showSpinner = isLoading || isLoadingExternal;

  return (
    <div ref={containerRef} className={cn("relative h-full w-full", className)}>
      <canvas
        ref={canvasRef}
        className={cn("h-full w-full transition-opacity duration-150", {
          "opacity-0": showSpinner || loadError,
        })}
      />

      {showSpinner && !loadError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PixelatedSpinner
            color={color}
            size={Math.max(16, Math.min(finalHeight, 48))}
            pixelSize={3}
            gap={2}
          />
        </div>
      )}

      {loadError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <PixelatedFrowny color={color} />
        </div>
      )}
    </div>
  );
};

export default Waveform;
