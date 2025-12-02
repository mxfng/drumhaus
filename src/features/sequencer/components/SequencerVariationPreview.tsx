import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/utils";
import { usePatternStore } from "../store/usePatternStore";

interface SequencerVariationPreviewProps {
  variation: number;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Canvas-based pattern preview for a specific variation.
 * Renders an 8x16 grid showing which steps are active.
 */
export const SequencerVariationPreview: React.FC<
  SequencerVariationPreviewProps
> = ({ variation, className, width, height }) => {
  const { pattern, patternVersion } = usePatternStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({
    width: width || 100,
    height: height || 50,
  });

  // Measure container size on mount and resize
  useEffect(() => {
    if (!width || !height) {
      const updateDimensions = () => {
        if (containerRef.current) {
          const { width: containerWidth, height: containerHeight } =
            containerRef.current.getBoundingClientRect();
          setDimensions({
            width: Math.floor(containerWidth),
            height: Math.floor(containerHeight),
          });
        }
      };

      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, [width, height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas resolution to match container dimensions
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Calculate grid layout based on available space
    const cols = 16;
    const rows = 8;

    // Calculate cell size to fit the canvas
    const availableWidth = canvas.width;
    const availableHeight = canvas.height;

    // Each cell needs space for block + gap (except trailing)
    const cellWidth = availableWidth / (cols + (cols - 1) * 0.5); // block + 0.5 gap per cell
    const cellHeight = availableHeight / (rows + (rows - 1) * 0.5);

    const blockWidth = Math.max(1, Math.floor(cellWidth));
    const blockHeight = Math.max(1, Math.floor(cellHeight));
    const gap = Math.max(1, Math.floor(blockWidth * 0.5));

    // Get colors from CSS variables
    const rootStyles = getComputedStyle(document.documentElement);
    const primaryColor =
      rootStyles.getPropertyValue("--color-primary").trim() || "#ff7b00";
    const borderColor =
      rootStyles.getPropertyValue("--color-border").trim() ||
      "rgba(176, 147, 116, 0.3)";

    // Clear canvas (transparent background)
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all steps
    for (let voiceIdx = 0; voiceIdx < rows; voiceIdx++) {
      const voiceIndex = 7 - voiceIdx;
      const triggers =
        pattern[voiceIndex]?.variations[variation]?.triggers || [];

      for (let stepIdx = 0; stepIdx < cols; stepIdx++) {
        const x = stepIdx * (blockWidth + gap);
        const y = voiceIdx * (blockHeight + gap);
        const isTriggerOn = triggers[stepIdx];

        ctx.fillStyle = isTriggerOn ? primaryColor : borderColor;
        ctx.fillRect(x, y, blockWidth, blockHeight);
      }
    }
  }, [pattern, variation, patternVersion, dimensions]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className={cn("h-full w-full", className)}
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
};
