import React, { useEffect, useRef } from "react";
import * as Tone from "tone/build/esm/index";

// Define TypeScript types
interface FrequencyAnalyzerProps {}

const FrequencyAnalyzer: React.FC<FrequencyAnalyzerProps> = () => {
  const analyzer = useRef<Tone.Analyser | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Create the frequency analyzer
    analyzer.current = new Tone.Analyser("fft", 512);

    // Connect the Tone.Destination to the analyzer
    Tone.Destination.connect(analyzer.current);

    // Create a canvas for visualization
    const canvas = canvasRef.current;
    const canvasContext = canvas?.getContext("2d");

    if (!canvas || !canvasContext) {
      console.error("Canvas or context not available.");
      return;
    }

    // Inside the animate function
    const animate = () => {
      requestAnimationFrame(animate);

      // Get the frequency data
      const dataArray = analyzer.current?.getValue();

      if (!dataArray) {
        console.error("Frequency data not available.");
        return;
      }

      // Clear the canvas
      const canvas = canvasRef.current;
      const canvasContext = canvas?.getContext("2d");
      if (!canvas || !canvasContext) {
        console.error("Canvas or context not available.");
        return;
      }
      canvasContext.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the frequency data as bars
      const barWidth = canvas.width / dataArray.length;
      const gapWidth = barWidth; // Set the gap width to one bar width
      dataArray.forEach((value, index) => {
        const barHeight = (typeof value === "number" ? value : 0) + 80; // Adjust for visualization
        const x = index * (barWidth + gapWidth); // Add the gap width to the x-position calculation
        const y = canvas.height - barHeight; // Calculate the y position based on the bar height
        canvasContext.fillStyle = "#ff7b00";
        canvasContext.fillRect(x, y, barWidth, barHeight);
      });
    };

    // Start the animation
    animate();

    return () => {
      Tone.Destination.disconnect(analyzer.current!);
    };
  }, []);

  return <canvas ref={canvasRef} width={470} height={60} />;
};

export default FrequencyAnalyzer;
