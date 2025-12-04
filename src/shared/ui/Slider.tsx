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
    <SliderPrimitive.Track className="bg-background relative h-2 w-full grow overflow-hidden rounded-full border">
      <SliderPrimitive.Range className="bg-primary absolute h-full" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="shadow-neu-raised block h-5 w-5 rounded-full border bg-[linear-gradient(160deg,var(--color-gradient-light),var(--color-gradient-dark))] transition-colors" />
  </SliderPrimitive.Root>
));
Slider.displayName = "Slider";
