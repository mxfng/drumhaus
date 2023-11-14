"use client";

import React, { useEffect, useRef } from "react";

interface AmplitudeVisualizerProps {
  audioFile: string;
  width: number;
}

const Waveform: React.FC<AmplitudeVisualizerProps> = ({ audioFile, width }) => {
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

        // Function to draw the amplitude graphic with silence removal
        function drawAmplitudeGraphic() {
          const threshold = 0.01; // Adjust this threshold based on your needs
          let endIdx = amplitudeData.length - 1;

          // Find the index of the last non-silent sample
          for (let i = amplitudeData.length - 1; i >= 0; i--) {
            if (Math.abs(amplitudeData[i]) > threshold) {
              endIdx = i;
              break;
            }
          }

          const trimmedData = amplitudeData.slice(0, endIdx);

          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.beginPath();
          ctx.moveTo(0, ((trimmedData[0] + 1) * canvasHeight) / 2);

          for (let i = 1; i < trimmedData.length; i++) {
            const x = (i / trimmedData.length) * canvasWidth;
            const y = ((trimmedData[i] + 1) * canvasHeight) / 2;
            ctx.lineTo(x, y);
          }

          ctx.strokeStyle = "orange";
          ctx.stroke();
        }

        // Call the drawAmplitudeGraphic function to draw the static graphic
        drawAmplitudeGraphic();
      });
  }, [audioFile, width]);

  return <canvas ref={canvasRef} />;
};

export default Waveform;
