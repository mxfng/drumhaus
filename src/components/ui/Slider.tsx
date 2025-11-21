import { forwardRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

export const Slider = forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={`
      relative flex w-full touch-none select-none items-center
      ${className ?? ""}
    `}
    {...props}
  >
    <SliderPrimitive.Track
      className="
        relative h-2 w-full grow overflow-hidden rounded-full
        bg-lowlight
        shadow-[inset_2px_2px_4px_var(--color-shadow-60),inset_-1px_-1px_3px_var(--color-highlight-30)]
      "
    >
      <SliderPrimitive.Range className="absolute h-full bg-accent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb
      className="
        block h-5 w-5 rounded-full
        shadow-neu-raised
        bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))]
        transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2
        disabled:pointer-events-none disabled:opacity-50
      "
    />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
