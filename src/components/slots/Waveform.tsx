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
  const filename = (audioFile.split("/").pop() || "").split(".")[0] || "";

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const canvasWidth = width;
    const canvasHeight = 60;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    fetch(`/waveforms/${filename}.json`)
      .then((response) => response.json())
      .then((data) => {
        const amplitudeData: number[][] = data.amplitude_envelope;

        function draw() {
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
                Math.abs(
                  (Math.log10(channelData[i] + 1) + 1) * (canvasHeight / 2)
                );

              ctx.fillStyle = color;
              ctx.fillRect(x, y, rectWidth, rectHeight);
            }

            for (let i = 0; i < channelData.length; i++) {
              const x = i * (rectWidth + gapWidth);
              const rectHeight =
                canvasHeight / 2 -
                Math.abs(
                  (Math.log10(channelData[i] + 1) + 1) * (canvasHeight / 2)
                );

              ctx.fillStyle = color;
              ctx.fillRect(x, canvasHeight / 2, rectWidth, rectHeight);
            }
          }
        }

        // Call the draw function to draw the waveform
        draw();
      });
  }, [filename, width, color]);

  return <canvas ref={canvasRef} />;
};

export default Waveform;
