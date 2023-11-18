"use client";

import { Box, Center, Text } from "@chakra-ui/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { transformKnobValueExponential } from "./Knob";

type KnobProps = {
  size: number;
  knobValue: number;
  setKnobValue: (newState: number) => void;
  knobTitle?: string;
  knobTransformRangeLow?: [number, number];
  knobTransformRangeHigh?: [number, number];
  knobUnits?: string;
};

// Transform knob values (0-100) to Hz
export const transformKnobFilterValue = (
  input: number,
  rangeLow: [number, number] = [0, 15000],
  rangeHigh: [number, number] = [0, 15000]
): number => {
  const [min, max] = input <= 49 ? rangeLow : rangeHigh;
  const newInput = ((input <= 49 ? input : input - 50) / 49) * 100;
  return transformKnobValueExponential(newInput, [min, max]);
};

const MAX_KNOB_VALUE = 100;

export const KnobFilter: React.FC<KnobProps> = ({
  size,
  knobValue,
  setKnobValue,
  knobTitle = "FILTER",
  knobUnits = "Hz",
}) => {
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [mouseDownY, setMouseDownY] = useState({ x: 0, y: 0 });

  const mouseY = useMotionValue(knobValue);
  const rotation = useTransform(mouseY, [0, MAX_KNOB_VALUE], [-225, 45]);

  useEffect(() => {
    const setValueOnMouseMove = (ev: MouseEvent) => {
      if (isMouseDown) {
        const newKnobValue = Math.max(
          0,
          Math.min(mouseDownY.y - ev.clientY + knobValue, MAX_KNOB_VALUE)
        );
        mouseY.set(newKnobValue);
        setKnobValue(newKnobValue);
      }
    };

    if (isMouseDown) {
      window.addEventListener("mousemove", setValueOnMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", setValueOnMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", setValueOnMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // Prop drilling
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMouseDown]);

  useEffect(() => {
    return () => {
      setIsMouseDown(false);
    };
  }, []);

  const captureMouseDownY = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseDown(true);
    setMouseDownY({ x: event.clientX, y: event.clientY });
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  return (
    <>
      <Box>
        <Center>
          <Box
            key="knob-mask"
            w={`${size + 10}px`}
            h={`${size + 10}px`}
            m={2}
            position="relative"
          >
            <Center w="100%" h="100%">
              <motion.div
                className="knob-hitbox"
                onMouseDown={captureMouseDownY}
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
              ? `${transformKnobFilterValue(knobValue).toFixed(
                  0
                )} ${knobUnits} ${knobValue <= 49 ? "LP" : "HP"}`
              : knobTitle}
          </Text>
        </Center>
      </Box>
    </>
  );
};
