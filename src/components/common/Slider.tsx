"use client";

import {
  Box,
  Center,
  Slider,
  SliderThumb,
  SliderTrack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

export const Sliderz: React.FC<any> = ({
  size,
  title,
  sliderValue,
  setSliderValue,
  defaultValue,
}) => {
  const [isMouseDown, setIsMouseDown] = useState(false);

  const immutableDefaultValue = defaultValue;

  const handleDoubleClick = () => {
    setSliderValue(immutableDefaultValue);
  };

  return (
    <Box
      position="relative"
      onDoubleClick={handleDoubleClick}
      onMouseDown={() => setIsMouseDown(true)}
      onMouseUp={() => setIsMouseDown(false)}
    >
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
          >
            <SliderTrack></SliderTrack>
            <SliderThumb
              width={`${size / 4}px`}
              borderRadius="8px"
              className="neumorphicRaised"
            />
          </Slider>
        </Center>
      </Box>

      <Text fontSize={10} color="gray" position="absolute" left={2} bottom={5}>
        L
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
        |
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
        R
      </Text>
      {title ? (
        <Text
          fontSize={10}
          color="gray"
          w={`${size}px`}
          align="center"
          left={1}
          bottom={-2}
          position="absolute"
        >
          {title}
        </Text>
      ) : null}
    </Box>
  );
};
