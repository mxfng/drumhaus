import { cn } from "@/shared/lib/utils";

type PixelatedFrownyProps = {
  /** Overall size of the frowny face box (width = height) */
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

export const PixelatedFrowny: React.FC<PixelatedFrownyProps> = ({
  size = 48,
  color = "#ff7b00",
  pixelSize = 4,
  gap = 6,
  className,
}) => {
  // 8x8 grid for a clearer frowny face
  const grid = 8;
  const total = grid * grid;

  // Define the frowny face pattern
  // 1 = filled pixel, 0 = empty

  // clear, classic frowny face expression in 8x8 grid
  // prettier-ignore
  const frownyPattern = [
    0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,
    0,0,1,0,0,1,0,0,
    0,0,0,0,0,0,0,0,
    0,0,1,1,1,1,0,0,
    0,1,0,0,0,0,1,0,
    0,0,0,0,0,0,0,0,
    0,0,0,0,0,0,0,0,
  ];

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={{ containerType: "size" }}
    >
      <div
        className="pixelated-frowny grid"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          aspectRatio: "1",
          gridTemplateColumns: `repeat(${grid}, ${pixelSize}px)`,
          gridTemplateRows: `repeat(${grid}, ${pixelSize}px)`,
          gap: `${gap}px`,
          justifyContent: "center",
          alignContent: "center",
          imageRendering: "pixelated",
          transform: `scale(min(1, min(100cqw / ${size}, 100cqh / ${size})))`,
          transformOrigin: "center",
        }}
      >
        {Array.from({ length: total }).map((_, i) => {
          const shouldFill = frownyPattern[i] === 1;

          return (
            <div
              key={i}
              className={cn(
                "bg-border rounded-full",
                shouldFill && "shadow-[0_0_8px_rgba(255,123,0,0.6)]",
              )}
              style={{
                width: `${pixelSize}px`,
                height: `${pixelSize}px`,
                ...(shouldFill
                  ? {
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}`,
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
