import { useCallback, useContext, useEffect, useRef, useState } from "react";

import { getCachedWaveform, TransientWaveformData } from "@/core/audio/cache";
import { WAVEFORM_VALUE_SCALE } from "@/core/audio/cache/constants";
import { PixelatedFrowny } from "@/shared/components/PixelatedFrowny";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import { WaveformReadinessContext } from "@/shared/hooks/useWaveformReadiness";
import { cn } from "@/shared/lib/utils";

interface WaveformProps {
  audioFile: string;
  width?: number;
  height?: number;
  color?: string;
  onError?: (error: Error) => void;
  onSuccess?: () => void;
  className?: string;
  /** Keep spinner visible even if waveform data is already loaded (e.g. external runtime pending). */
  isLoadingExternal?: boolean;
}

const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  height,
  color = "#ff7b00", // must be hardcoded due to canvas
  onError,
  onSuccess,
  className,
  isLoadingExternal = false,
}) => {
  // Derive waveform key by stripping /samples/ prefix and extension, but keep subfolders
  const normalizedPath = audioFile
    .replace(/^\/+/, "")
    .replace(/^samples\//, "");
  const sampleFilename = normalizedPath.replace(/\.[^.]+$/, "");

  const waveformReadinessContext = useContext(WaveformReadinessContext);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [waveformData, setWaveformData] =
    useState<TransientWaveformData | null>(null);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
    let isMounted = true;

    const loadWaveform = async () => {
      setIsLoading(true);
      setLoadError(null);
      setWaveformData(null);

      try {
        const data = await getCachedWaveform(sampleFilename);
        if (!isMounted) return;
        setWaveformData(data);
        onSuccess?.();
        waveformReadinessContext?.registerWaveformLoaded();
      } catch (error) {
        if (!isMounted) return;
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        setLoadError(normalizedError);
        console.error(`Failed to load waveform for ${sampleFilename}`, error);
        if (onError) {
          onError(normalizedError);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWaveform();

    return () => {
      isMounted = false;
    };
  }, [sampleFilename, onError, onSuccess]);

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
