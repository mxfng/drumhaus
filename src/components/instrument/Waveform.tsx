import React, { useEffect, useRef } from "react";

import { getCachedWaveform } from "@/lib/audio/cache";

interface WaveformProps {
  audioFile: string;
  width: number;
  color?: string;
  onError?: (error: Error) => void;
}

const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  color = "#ff7b00",
  onError,
}) => {
  // Remove the leading directory and .wav file type from string
  // Filenames for waveforms are auto-generated and thus have the same name as the audio file
  const sampleFilename = (audioFile.split("/").pop() || "").split(".")[0] || "";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

    canvas.width = width;
    canvas.height = 60;

    // Load waveform data using Cache API
    getCachedWaveform(sampleFilename)
      .then((data) => {
        const amplitudeData: number[][] = data.amplitude_envelope;
        draw(amplitudeData, ctx, canvas.width, canvas.height);
      })
      .catch((error) => {
        console.error(`Failed to load waveform for ${sampleFilename}`, error);
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)));
        }
      });
  }, [sampleFilename, width, color, onError]);

  return <canvas ref={canvasRef} />;
};

export default Waveform;
