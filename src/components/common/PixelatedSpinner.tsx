import React from "react";

type PixelatedSpinnerProps = {
  /** Overall size of the spinner box (width = height) */
  size?: number; // in px
  /** Color of the pixels */
  color?: string;
  /** Size of each pixel square */
  pixelSize?: number; // in px
  /** Gap between pixels */
  gap?: number; // in px
};

export const PixelatedSpinner: React.FC<PixelatedSpinnerProps> = ({
  size = 48,
  color = "#ff7b00",
  pixelSize = 4,
  gap = 4,
}) => {
  const grid = 4;
  const total = grid * grid;

  return (
    <div
      className="pixelated-spinner"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        display: "grid",
        gridTemplateColumns: `repeat(${grid}, ${pixelSize}px)`,
        gridTemplateRows: `repeat(${grid}, ${pixelSize}px)`,
        gap: `${gap}px`,
        justifyContent: "center",
        alignContent: "center",
        imageRendering: "pixelated",
      }}
    >
      {Array.from({ length: total }).map((_, i) => {
        const delay = (i * 0.1) % 1;

        return (
          <div
            key={i}
            className="pixelated-spinner__pixel"
            style={{
              width: `${pixelSize}px`,
              height: `${pixelSize}px`,
              backgroundColor: color,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
};
