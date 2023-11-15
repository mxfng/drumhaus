"use client";

import { Box, Center, Text } from "@chakra-ui/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

type KnobProps = {
  size: number;
  knobValue: number;
  setKnobValue: (newState: number) => void;
  knobTitle?: string;
  knobTransformRange?: [number, number];
  knobUnits?: string;
};

// Transform knob values (0-100) to any Tone.js parameter range [min, max]
export const transformKnobValue = (
  input: number,
  range: [number, number]
): number => {
  const [newRangeMin, newRangeMax] = range;
  const scalingFactor = (newRangeMax - newRangeMin) / 100;
  return scalingFactor * input + newRangeMin;
};

export const Knob: React.FC<KnobProps> = ({
  size,
  knobValue,
  setKnobValue,
  knobTitle,
  knobTransformRange = [0, 100],
  knobUnits = "",
}) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mouseDown, setMouseDown] = useState({ x: 0, y: 0 });
  const maxKnobValue = 100;

  const mouseYMotion = useMotionValue(knobValue);
  const rotation = useTransform(mouseYMotion, [0, maxKnobValue], [-225, 45]);

  const getNewKnobValue = (clientY: number) => {
    return Math.max(
      0,
      Math.min(mouseDown.y - clientY + knobValue, maxKnobValue)
    );
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseDown(true);
    setMouseDown({ x: event.clientX, y: event.clientY });

    // Debugging
    // console.log("mouse down");
    // console.log(`mouseDown: ${mouseDown.x}, ${mouseDown.y}`);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);

    // Debugging
    // console.log("mouse up");
  };

  useEffect(() => {
    const handleMouseMove = (ev: MouseEvent) => {
      if (isMouseDown) {
        mouseYMotion.set(getNewKnobValue(ev.clientY));
        setKnobValue(getNewKnobValue(ev.clientY));

        // Debugging
        // console.log(`interp Y: ${getKnobValue(ev.clientY)}`);
        // console.log("mouse moving while down");
      }
    };

    if (isMouseDown) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isMouseDown]);

  useEffect(() => {
    return () => {
      setIsMouseDown(false);
    };
  }, []);

  return (
    <>
      <Box>
        <Center>
          <Box
            key="knob-mask"
            w={`${size + 10}px`}
            h={`${size + 10}px`}
            m={2}
            // outline="1px solid blue"
            position="relative"
          >
            <Center w="100%" h="100%">
              <motion.div
                className="knob-hitbox"
                onMouseDown={handleMouseDown}
                style={{
                  rotate: rotation,
                  width: `${size}px`,
                  height: `${size}px`,
                  originX: 0.5,
                  originY: 0.5,
                  position: "absolute",
                  zIndex: 2,
                  borderRadius: size,
                }}
              >
                <Center h="100%" w="100%">
                  <Center
                    className="knob-tick"
                    h={`${size}px`}
                    w={`${size}px`}
                    position="absolute"
                    pointerEvents="none"
                    zIndex={3}
                  >
                    <Box
                      w={`${size / 4}px`}
                      h={`${Math.floor(size / 12)}px`}
                      bg="darkorange"
                      position="absolute"
                      right={0}
                    />
                  </Center>
                </Center>
              </motion.div>
              <Box
                className="knob-body"
                w={`${size}px`}
                h={`${size}px`}
                bg="silver"
                position="relative"
                borderRadius="full"
                boxShadow="0 4px 12px rgba(0, 0, 0, 0.2)"
              />
              <motion.div
                className="knob-dot-min-transform"
                style={{
                  rotate: -180,
                  width: `${size}px`,
                  height: `${size}px`,
                  originX: 0.5,
                  originY: 0.5,
                  position: "absolute",
                }}
              >
                <Box
                  className="knob-dot-min"
                  w={`4px`}
                  h={`4px`}
                  bg="gray"
                  position="absolute"
                  borderRadius="full"
                  opacity={0.3}
                  right={0}
                  boxShadow="0 4px 12px rgba(0, 0, 0, 0.2)"
                />
              </motion.div>
              <motion.div
                className="knob-dot-max-transform"
                style={{
                  rotate: 90,
                  width: `${size}px`,
                  height: `${size}px`,
                  originX: 0.5,
                  originY: 0.5,
                  position: "absolute",
                }}
              >
                <Box
                  className="knob-dot-max"
                  w={`4px`}
                  h={`4px`}
                  bg="gray"
                  position="absolute"
                  borderRadius="full"
                  opacity={0.3}
                  right={0}
                  boxShadow="0 4px 12px rgba(0, 0, 0, 0.2)"
                />
              </motion.div>
            </Center>
          </Box>
        </Center>
        <Center>
          <Text fontSize={12} color="gray" my={-3}>
            {isMouseDown
              ? `${transformKnobValue(
                  knobValue,
                  knobTransformRange
                )} ${knobUnits}`
              : knobTitle}
          </Text>
        </Center>
      </Box>
    </>
  );
};
