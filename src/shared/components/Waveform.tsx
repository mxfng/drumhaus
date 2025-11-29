import React, { useEffect, useRef, useState } from "react";

import { getCachedWaveform } from "@/core/audio/cache";

interface WaveformProps {
  audioFile: string;
  width?: number;
  height?: number;
  color?: string;
  onError?: (error: Error) => void;
  onLoad?: () => void;
}

const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  height,
  color = "#ff7b00", // must be hardcoded due to canvas
  onError,
  onLoad,
}) => {
  // Remove the leading directory and .wav file type from string
  // Filenames for waveforms are auto-generated and thus have the same name as the audio file
  const sampleFilename = (audioFile.split("/").pop() || "").split(".")[0] || "";

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
      amplitudeData: number[][],
      ctx: CanvasRenderingContext2D,
      canvasWidth: number,
      canvasHeight: number,
    ) => {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const channelCount = amplitudeData.length;
      const rectWidth = 1; // Adjust the width as needed
      const gapWidth = 1; // Adjust the gap width as needed

      for (let channel = 0; channel < channelCount; channel++) {
        const channelData = amplitudeData[channel];

        for (let i = 0; i < channelData.length; i++) {
          const x = i * (rectWidth + gapWidth);
          const y =
            (Math.log10(channelData[i] + 1) + 1) * (canvasHeight / 2) +
            channel * (canvasHeight / 2);
          const rectHeight =
            canvasHeight / 2 -
            Math.abs((Math.log10(channelData[i] + 1) + 1) * (canvasHeight / 2));

          ctx.fillStyle = color;
          ctx.fillRect(x, y, rectWidth, rectHeight);
        }

        for (let i = 0; i < channelData.length; i++) {
          const x = i * (rectWidth + gapWidth);
          const rectHeight =
            canvasHeight / 2 -
            Math.abs((Math.log10(channelData[i] + 1) + 1) * (canvasHeight / 2));

          ctx.fillStyle = color;
          ctx.fillRect(x, canvasHeight / 2, rectWidth, rectHeight);
        }
      }
    };

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    if (!canvas || !ctx) {
      return;
    }

    canvas.width = finalWidth;
    canvas.height = finalHeight;

    // Load waveform data using Cache API
    getCachedWaveform(sampleFilename)
      .then((data) => {
        const amplitudeData: number[][] = data.amplitude_envelope;
        draw(amplitudeData, ctx, canvas.width, canvas.height);
        if (onLoad) {
          onLoad();
        }
      })
      .catch((error) => {
        console.error(`Failed to load waveform for ${sampleFilename}`, error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
  }, [sampleFilename, finalWidth, finalHeight, color, onError, onLoad]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
    </div>
  );
};

export default Waveform;
