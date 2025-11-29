import { useRef, useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { transformKnobValueLinear } from "@/shared/knob/lib/transform";
import { quantize } from "@/shared/lib/utils";
import { Label, Tooltip } from "@/shared/ui";

type HardwareSliderProps = {
  title?: string;
  sliderValue: number;
  setSliderValue: (value: number) => void;
  defaultValue: number;
  leftLabel?: string;
  rightLabel?: string;
  centerLabel?: string;
  transformRange?: [number, number];
  displayRange?: [number, number];
  isDisabled?: boolean;
  valueStep?: number;
  valueDecimals?: number;
};

export const HardwareSlider: React.FC<HardwareSliderProps> = ({
  title,
  sliderValue,
  setSliderValue,
  defaultValue,
  leftLabel = "",
  rightLabel = "",
  centerLabel = "",
  transformRange = [0, 100],
  displayRange,
  isDisabled = false,
  valueStep = 1,
  valueDecimals = 0,
}) => {
  const immutableDefaultValue = useRef(defaultValue);
  const step = valueStep > 0 ? valueStep : 1;
  const [isDragging, setIsDragging] = useState(false);

  const handleDoubleClick = () => {
    setSliderValue(immutableDefaultValue.current);
  };

  const handleChange = (value: number[]) => {
    const quantizedValue = quantize(value[0], step);
    setSliderValue(quantizedValue);
  };

  const formattedTransformedValue = transformKnobValueLinear(
    sliderValue,
    displayRange ?? transformRange,
  ).toFixed(valueDecimals);

  return (
    <div
      className="flex w-full flex-col gap-0.5"
      onDoubleClick={handleDoubleClick}
    >
      {/* Labels */}
      <div className="relative flex items-end justify-between px-0.5">
        <Label className="sm:text-[10px]">{leftLabel}</Label>
        <Label className="absolute inset-x-0 text-center opacity-60 sm:text-[8px]">
          {centerLabel}
        </Label>
        <Label className="sm:text-[10px]">{rightLabel}</Label>
      </div>

      {/* Slider track */}
      <div
        className="flex h-[10px] items-center rounded-lg shadow-(--slider-track-shadow)"
        style={{ background: "var(--slider-track-bg)" }}
      >
        <SliderPrimitive.Root
          className="relative flex w-full touch-none items-center select-none"
          value={[sliderValue]}
          min={0}
          max={100}
          step={step}
          onValueChange={handleChange}
          onPointerDown={() => setIsDragging(true)}
          onPointerUp={() => setIsDragging(false)}
          disabled={isDisabled}
        >
          <SliderPrimitive.Track className="relative h-4 w-full grow rounded-full bg-transparent sm:h-1">
            <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          </SliderPrimitive.Track>
          <Tooltip
            content={formattedTransformedValue}
            delayDuration={0}
            side="top"
            open={isDragging}
          >
            <SliderPrimitive.Thumb
              className="font-pixel neu-raised block h-6 w-8 cursor-pointer rounded-lg shadow-[inset_0_2px_4px_var(--color-shadow-60)] focus:outline-none sm:h-4 sm:w-6"
              aria-label={title || "Slider thumb"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={sliderValue}
            />
          </Tooltip>
        </SliderPrimitive.Root>
      </div>

      {/* Title */}
      {title && <Label className="mt-2 text-center">{title}</Label>}
    </div>
  );
};
