import "@/app/styles/pixelated-spinner.css";

import { cn } from "@/shared/lib/utils";

type PixelatedSpinnerProps = {
  /** Overall size of the spinner box (width = height) */
  size?: number; // in px
  /** Color of the pixels */
  color?: string;
  /** Size of each pixel square */
  pixelSize?: number; // in px
  /** Gap between pixels */
  gap?: number; // in px
  /** Optional className for the container */
  className?: string;
};

const GRID = 3;
const RING_ORDER = [1, 2, 5, 8, 7, 6, 3, 0]; // clockwise around the center

export const PixelatedSpinner: React.FC<PixelatedSpinnerProps> = ({
  size = 48,
  color = "#ff7b00",
  pixelSize = 4,
  gap = 6,
  className,
}) => {
  const total = GRID * GRID;
  const glow = `0 0 8px ${color}`;

  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden",
        className,
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        containerType: "size",
      }}
    >
      <div
        className="grid"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          aspectRatio: "1",
          gridTemplateColumns: `repeat(${GRID}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${GRID}, ${pixelSize}px)`,
          gap: `${gap}px`,
          justifyContent: "center",
          alignContent: "center",
          imageRendering: "pixelated",
          transform: `scale(min(1, min(100cqw / ${size}, 100cqh / ${size})))`,
          transformOrigin: "center",
        }}
      >
        {Array.from({ length: total }).map((_, index) => {
          const orderIndex = RING_ORDER.indexOf(index);
          const isRingDot = orderIndex !== -1;

          return (
            <span
              key={index}
              className={cn(
                "bg-border rounded-full",
                isRingDot && "pixelated-spinner__pixel",
                !isRingDot && "opacity-40",
              )}
              style={{
                width: `${pixelSize}px`,
                height: `${pixelSize}px`,
                ...(isRingDot
                  ? {
                      backgroundColor: color,
                      boxShadow: glow,
                      animationDelay: `${orderIndex * 0.08}s`,
                    }
                  : {}),
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
