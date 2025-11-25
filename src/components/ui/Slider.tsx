import { forwardRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

export const Slider = forwardRef<
  React.ComponentRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={`relative flex w-full touch-none items-center select-none ${className ?? ""} `}
    {...props}
  >
    <SliderPrimitive.Track className="bg-primary shadow-inset relative h-2 w-full grow cursor-pointer overflow-hidden rounded-full">
      <SliderPrimitive.Range className="bg-primary-muted absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="shadow-neu-raised focus-visible:ring-primary-muted block h-5 w-5 cursor-pointer rounded-full bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
