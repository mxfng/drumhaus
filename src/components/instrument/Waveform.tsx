"use client";

import React, { useEffect, useRef } from "react";

interface WaveformProps {
  audioFile: string;
  width: number;
  color?: string;
}

const Waveform: React.FC<WaveformProps> = ({
  audioFile,
  width,
  color = "#ff7b00",
}) => {
  // Remove the leading directory and .wav file type from string
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

    // Don't fetch if sample_name is empty (prevents 404 errors on fresh page load)
    if (!sampleFilename) {
      return;
    }

    // Try to get the waveform data from localStorage
    const cachedWaveform = localStorage.getItem(`${sampleFilename}.json`);

    if (cachedWaveform) {
      // If cached data exists, parse and use it
      const amplitudeData = JSON.parse(cachedWaveform);
      draw(amplitudeData, ctx, canvas.width, canvas.height);
    } else {
      fetch(`/waveforms/${sampleFilename}.json`)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to fetch waveform: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          const amplitudeData: number[][] = data.amplitude_envelope;

          // Cache the waveform data in localStorage
          localStorage.setItem(
            `${sampleFilename}.json`,
            JSON.stringify(amplitudeData),
          );

          // Call the draw function to draw the waveform
          draw(amplitudeData, ctx, canvas.width, canvas.height);
        })
        .catch((error) => {
          // Silently handle errors (e.g., 404 for missing waveforms)
          console.debug("Error loading waveform:", error);
        });
    }
  }, [sampleFilename, width, color]);

  return <canvas ref={canvasRef} />;
};

export default Waveform;
