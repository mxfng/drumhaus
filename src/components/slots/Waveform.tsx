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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const offlineContext = new OfflineAudioContext(2, 44100 * 40, 44100);
    const source = offlineContext.createBufferSource();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const canvasWidth = width;
    const canvasHeight = 50;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    fetch(`/samples/${audioFile}`)
      .then((response) => response.arrayBuffer())
      .then((buffer) => offlineContext.decodeAudioData(buffer))
      .then((decodedBuffer) => {
        source.buffer = decodedBuffer;
        source.connect(offlineContext.destination);
        source.start(0);

        return offlineContext.startRendering();
      })
      .then((renderedBuffer) => {
        const amplitudeData = renderedBuffer.getChannelData(0);

        function draw() {
          const silenceThreshold = 0.01;
          let endIndex = amplitudeData.length - 1;

          // Find the index of the last non-silent sample
          for (let index = amplitudeData.length - 1; index >= 0; index--) {
            if (Math.abs(amplitudeData[index]) > silenceThreshold) {
              endIndex = index;
              break;
            }
          }

          const trimmedData = amplitudeData.slice(0, endIndex);

          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.beginPath();
          ctx.moveTo(0, ((trimmedData[0] + 1) * canvasHeight) / 2);

          for (let i = 1; i < trimmedData.length; i++) {
            const x = (i / trimmedData.length) * canvasWidth;
            const y = ((trimmedData[i] + 1) * canvasHeight) / 2;
            ctx.lineTo(x, y);
          }

          ctx.strokeStyle = color;
          ctx.stroke();

          requestAnimationFrame(draw);
        }

        // Call the drawAmplitudeGraphic function to draw the static graphic
        draw();
      });
  }, [audioFile, width, color]);

  return <canvas ref={canvasRef} />;
};

export default Waveform;
