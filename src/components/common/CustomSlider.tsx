"use client";

import {
  Box,
  Center,
  Slider,
  SliderThumb,
  SliderTrack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import { useState } from "react";
import { transformKnobValue } from "./Knob";

export const CustomSlider: React.FC<any> = ({
  size,
  title,
  sliderValue,
  setSliderValue,
  defaultValue,
  leftLabel = "",
  rightLabel = "",
  centerLabel = "",
  transformRange = [0, 100],
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const immutableDefaultValue = defaultValue;

  const handleDoubleClick = () => {
    setSliderValue(immutableDefaultValue);
  };

  return (
    <Box position="relative" onDoubleClick={handleDoubleClick}>
      <Box
        w={`${size}px`}
        h="10px"
        position="relative"
        left={1}
        bottom={2}
        borderRadius="8px"
        boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
      >
        <Center w="100%" h="100%">
          <Slider
            w={`${size - size / 4}px`}
            value={sliderValue}
            focusThumbOnChange={false}
            min={0}
            max={100}
            onChange={(v) => setSliderValue(v)}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <SliderTrack></SliderTrack>
            <Tooltip
              hasArrow
              bg="darkorange"
              color="white"
              placement="top"
              isOpen={showTooltip}
              fontSize={10}
              label={`${transformKnobValue(sliderValue, transformRange)}`}
            >
              <SliderThumb
                width={`${size / 4}px`}
                borderRadius="8px"
                className="neumorphicRaised"
              />
            </Tooltip>
          </Slider>
        </Center>
      </Box>

      <Text fontSize={10} color="gray" position="absolute" left={2} bottom={5}>
        {leftLabel}
      </Text>
      <Text
        fontSize={8}
        w={`${size}px`}
        color="gray"
        position="absolute"
        left={1}
        bottom="22px"
        align="center"
      >
        {centerLabel}
      </Text>
      <Text
        fontSize={10}
        w={`${size}px`}
        color="gray"
        position="absolute"
        left={1}
        bottom={5}
        align="right"
      >
        {rightLabel}
      </Text>
      {title ? (
        <Text
          fontSize={10}
          color="gray"
          w={`${size}px`}
          align="center"
          left={1}
          bottom={-3}
          position="absolute"
        >
          {title}
        </Text>
      ) : null}
    </Box>
  );
};
