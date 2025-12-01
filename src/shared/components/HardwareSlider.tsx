import { useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cva } from "class-variance-authority";

import { ParamMapping } from "@/shared/knob/types/types";
import { cn } from "@/shared/lib/utils";
import { Label, Tooltip } from "@/shared/ui";

const sliderContainerVariants = cva("flex gap-2 flex-col", {
  variants: {
    orientation: {
      horizontal: "w-full",
      vertical: "h-full w-fit",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
  },
});

const sliderTrackVariants = cva(
  "flex items-center rounded-lg shadow-(--slider-track-shadow)",
  {
    variants: {
      orientation: {
        horizontal: "h-6",
        vertical: "w-3 flex-1",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  },
);

type HardwareSliderProps<TValue = number> = {
  /** Mapping to convert between slider value (0-100) and domain value */
  mapping: ParamMapping<TValue>;
  value: number;
  onValueChange: (value: number) => void;
  label?: string;
  isDisabled?: boolean;
  orientation?: "horizontal" | "vertical";
};

export const HardwareSlider = <TValue = number,>({
  mapping,
  value,
  onValueChange,
  label,
  isDisabled = false,
  orientation = "horizontal",
}: HardwareSliderProps<TValue>) => {
  const [isDragging, setIsDragging] = useState(false);

  const step = 100 / mapping.knobValueCount;
  const immutableDefaultValue = useRef(mapping.defaultKnobValue);

  const handleDoubleClick = () => {
    onValueChange(immutableDefaultValue.current);
  };

  const handleChange = (value: number[]) => {
    const domainValue = mapping.knobToDomain(value[0]);
    const canonicalKnobValue = mapping.domainToKnob(domainValue, value[0]);
    onValueChange(canonicalKnobValue);
  };

  const domainValue = mapping.knobToDomain(value);
  const formatted = mapping.format(domainValue, value);
  const formattedTransformedValue = `${formatted.value}${formatted.append ? ` ${formatted.append}` : ""}`;

  const isVertical = orientation === "vertical";
  const tooltipSide = isVertical ? "right" : "top";

  return (
    <div
      className={cn(sliderContainerVariants({ orientation }))}
      onDoubleClick={handleDoubleClick}
    >
      {/* Slider track */}
      <SliderPrimitive.Root
        className={cn(
          "relative flex touch-none select-none",
          isVertical
            ? "h-full w-full flex-col items-center"
            : "w-full items-center",
        )}
        value={[value]}
        min={0}
        max={100}
        step={step}
        orientation={orientation}
        onValueChange={handleChange}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        disabled={isDisabled}
      >
        <SliderPrimitive.Track
          className={cn(sliderTrackVariants({ orientation }))}
          style={{ background: "var(--slider-track-bg)" }}
        >
          <SliderPrimitive.Range
            className={cn(
              "absolute bg-transparent",
              isVertical ? "w-full" : "h-full",
            )}
          />
        </SliderPrimitive.Track>
        <Tooltip
          content={formattedTransformedValue}
          delayDuration={0}
          side={tooltipSide}
          open={isDragging}
        >
          <SliderPrimitive.Thumb
            className="font-pixel bg-surface border-shadow-30 block h-4 w-4 cursor-pointer rounded-full border focus:outline-none"
            aria-label={label || "Slider thumb"}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={value}
          />
        </Tooltip>
      </SliderPrimitive.Root>

      {/* Title */}
      {label && (
        <Label className={cn(isVertical ? "text-center" : "mt-2 text-center")}>
          {label}
        </Label>
      )}
    </div>
  );
};
