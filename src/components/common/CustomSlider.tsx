import * as SliderPrimitive from "@radix-ui/react-slider";

import { Tooltip } from "@/components/ui";
import { transformKnobValue } from "./knobTransforms";

type CustomSliderProps = {
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

export const CustomSlider: React.FC<CustomSliderProps> = ({
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
    <div className="relative" onDoubleClick={handleDoubleClick}>
      <div
        className="relative -bottom-2 left-px rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]"
        style={{ width: `${size}px`, height: "10px" }}
      >
        <div className="flex h-full w-full items-center justify-center">
          <SliderPrimitive.Root
            className="relative flex touch-none select-none items-center"
            style={{ width: `${size - size / 4}px` }}
            value={[sliderValue]}
            min={0}
            max={100}
            step={step}
            onValueChange={handleChange}
            disabled={isDisabled}
          >
            <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-transparent">
              <SliderPrimitive.Range className="absolute h-full bg-transparent" />
            </SliderPrimitive.Track>
            <Tooltip
              content={formattedTransformedValue}
              delayDuration={0}
              side="top"
            >
              <SliderPrimitive.Thumb
                className="neumorphicRaised block cursor-pointer rounded-lg focus:outline-none"
                style={{ width: `${size / 4}px`, height: "16px" }}
                aria-label="Slider thumb"
              />
            </Tooltip>
          </SliderPrimitive.Root>
        </div>
      </div>

      <span className="absolute bottom-5 left-2 font-pixel text-[10px] text-text">
        {leftLabel}
      </span>
      <span
        className="absolute bottom-[22px] left-px text-center font-pixel text-[8px] text-text"
        style={{ width: `${size}px` }}
      >
        {centerLabel}
      </span>
      <span
        className="absolute bottom-5 left-px text-right font-pixel text-[10px] text-text"
        style={{ width: `${size}px` }}
      >
        {rightLabel}
      </span>
      {title && (
        <span
          className="absolute -bottom-3 left-px text-center font-pixel text-[10px] text-text"
          style={{ width: `${size}px` }}
        >
          {title}
        </span>
      )}
    </div>
  );
};
