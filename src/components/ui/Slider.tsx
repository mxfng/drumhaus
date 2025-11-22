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
    <SliderPrimitive.Track className="bg-lowlight relative h-2 w-full grow overflow-hidden rounded-full shadow-[inset_2px_2px_4px_var(--color-shadow-60),inset_-1px_-1px_3px_var(--color-highlight-30)]">
      <SliderPrimitive.Range className="bg-accent absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="shadow-neu-raised focus-visible:ring-accent block h-5 w-5 rounded-full bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))] transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
