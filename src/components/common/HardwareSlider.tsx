import { useState } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { Label, Tooltip } from "@/components/ui";
import { transformKnobValue } from "./knobTransforms";

type HardwareSliderProps = {
  size: number;
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
  size,
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
  const immutableDefaultValue = defaultValue;
  const step = valueStep > 0 ? valueStep : 1;
  const [isDragging, setIsDragging] = useState(false);

  const handleDoubleClick = () => {
    setSliderValue(immutableDefaultValue);
  };

  const handleChange = (value: number[]) => {
    const quantizedValue = Math.round(value[0] / step) * step;
    setSliderValue(quantizedValue);
  };

  const formattedTransformedValue = transformKnobValue(
    sliderValue,
    displayRange ?? transformRange,
  ).toFixed(valueDecimals);

  return (
    <div
      className="flex flex-col gap-0.5"
      style={{ width: `${size}px` }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Labels */}
      <div className="relative flex items-end justify-between px-1">
        <Label className="text-[10px]">{leftLabel}</Label>
        <Label className="absolute inset-x-0 text-center text-[8px] opacity-60">
          {centerLabel}
        </Label>
        <Label className="text-[10px]">{rightLabel}</Label>
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
          <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-transparent">
            <SliderPrimitive.Range className="absolute h-full bg-transparent" />
          </SliderPrimitive.Track>
          <Tooltip
            content={formattedTransformedValue}
            delayDuration={0}
            side="top"
            open={isDragging ? true : undefined}
          >
            <SliderPrimitive.Thumb
              className="font-pixel neu-raised block cursor-pointer rounded-lg focus:outline-none"
              style={{
                width: `${size / 4}px`,
                height: "16px",
                boxShadow: `
                  var(--shadow-neu-raised),
                  0 4px 3px -1px rgb(0 0 0 / 0.4)
                `,
              }}
              aria-label="Slider thumb"
            />
          </Tooltip>
        </SliderPrimitive.Root>
      </div>

      {/* Title */}
      {title && <Label className="mt-2 text-center">{title}</Label>}
    </div>
  );
};
