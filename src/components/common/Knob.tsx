"use client";

import { Box, Center, Text } from "@chakra-ui/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

type KnobProps = {
  color?: string;
  size: number;
  knobValue: number;
  setKnobValue: (newState: number) => void;
  knobTitle?: string;
  knobTransformRange?: [number, number];
  knobUnits?: string;
  exponential?: boolean;
  filter?: boolean;
  defaultValue?: number;
};

// Transform knob values (0-100) to any Tone.js parameter range [min, max]
export const transformKnobValue = (
  input: number,
  range: [number, number]
): number => {
  const [newRangeMin, newRangeMax] = range;
  const scalingFactor = (newRangeMax - newRangeMin) / MAX_KNOB_VALUE;
  return scalingFactor * input + newRangeMin;
};

export const transformKnobFilterValue = (
  input: number,
  rangeLow: [number, number] = [0, 15000],
  rangeHigh: [number, number] = [0, 15000]
): number => {
  const [min, max] = input <= 49 ? rangeLow : rangeHigh;
  const newInput = ((input <= 49 ? input : input - 50) / 49) * 100;
  return transformKnobValueExponential(newInput, [min, max]);
};

export const transformKnobValueExponential = (
  input: number,
  range: [number, number]
): number => {
  const inputMin = 0;
  const inputMax = MAX_KNOB_VALUE;
  const [outputMin, outputMax] = range;

  const normalizedInput = (input - inputMin) / (inputMax - inputMin);
  const exponentialValue = Math.pow(normalizedInput, 2);
  const mappedValue = outputMin + exponentialValue * (outputMax - outputMin);

  return mappedValue;
};

const MAX_KNOB_VALUE = 100;

export const Knob: React.FC<KnobProps> = ({
  size,
  knobValue,
  setKnobValue,
  knobTitle,
  knobTransformRange = [0, MAX_KNOB_VALUE],
  knobUnits = "",
  exponential = false,
  filter = false,
  defaultValue = 50,
}) => {
  const [isMoving, setIsMoving] = useState(false);
  const [moveStartY, setMoveStartY] = useState({ x: 0, y: 0 });

  const moveY = useMotionValue(knobValue);
  const rotation = useTransform(moveY, [0, MAX_KNOB_VALUE], [-225, 45]);

  const immutableDefaultValue = defaultValue;

  useEffect(() => {
    // hacky way to set knob from presets and kits
    if (!isMoving) {
      moveY.set(knobValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knobValue]);

  useEffect(() => {
    const setValueOnMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      if (isMoving) {
        const clientY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
        const newKnobValue = Math.max(
          0,
          Math.min(moveStartY.y - clientY + knobValue, MAX_KNOB_VALUE)
        );
        moveY.set(newKnobValue);
        setKnobValue(newKnobValue);
      }
    };

    if (isMoving) {
      window.addEventListener("mousemove", setValueOnMove);
      window.addEventListener("touchmove", setValueOnMove, { passive: false });
      window.addEventListener("mouseup", handleMoveEnd);
      window.addEventListener("touchend", handleMoveEnd);
    } else {
      window.removeEventListener("mousemove", setValueOnMove);
      window.removeEventListener("touchmove", setValueOnMove);
      window.removeEventListener("mouseup", handleMoveEnd);
      window.removeEventListener("touchend", handleMoveEnd);
    }

    return () => {
      window.removeEventListener("mousemove", setValueOnMove);
      window.removeEventListener("touchmove", setValueOnMove);
      window.removeEventListener("mouseup", handleMoveEnd);
      window.removeEventListener("touchend", handleMoveEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMoving]);

  useEffect(() => {
    return () => {
      setIsMoving(false);
    };
  }, []);

  const captureMoveStartY = (
    ev: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>
  ) => {
    setIsMoving(true);
    setMoveStartY({
      x: "touches" in ev ? ev.touches[0].clientX : ev.clientX,
      y: "touches" in ev ? ev.touches[0].clientY : ev.clientY,
    });
  };

  const handleMoveEnd = () => {
    setIsMoving(false);
  };

  const handleDoubleClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    ev.preventDefault();
    setKnobValue(immutableDefaultValue);
  };

  return (
    <>
      <Box h={`${size + 30}px`}>
        <Center>
          <Box
            key="knob-mask"
            w={`${size + 10}px`}
            h={`${size + 10}px`}
            m={2}
            position="relative"
          >
            <Center w="100%" h="100%" borderRadius="full" cursor="grab">
              <motion.div
                className="knob-hitbox"
                onMouseDown={captureMoveStartY}
                onTouchStart={captureMoveStartY}
                onDoubleClick={handleDoubleClick}
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
                      borderRadius="8px 0 0 8px"
                    />
                  </Center>
                </Center>
              </motion.div>
              <Box
                w={`${size}px`}
                h={`${size}px`}
                position="relative"
                borderRadius="full"
                className="neumorphicTallRaised"
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
                  boxShadow="0 4px 12px rgba(176, 147, 116, 0.6)"
                />
              </motion.div>
            </Center>
          </Box>
        </Center>
        <Center>
          <Text fontSize={12} color="gray" my={-3}>
            {isMoving
              ? filter
                ? `${transformKnobFilterValue(knobValue).toFixed(
                    0
                  )} ${knobUnits} ${knobValue <= 49 ? "LP" : "HP"}`
                : exponential
                ? `${
                    knobUnits
                      ? transformKnobValueExponential(
                          knobValue,
                          knobTransformRange
                        ).toFixed(1)
                      : transformKnobValueExponential(
                          knobValue,
                          knobTransformRange
                        ).toFixed(0)
                  } ${knobUnits}`
                : `${
                    knobUnits
                      ? transformKnobValue(
                          knobValue,
                          knobTransformRange
                        ).toFixed(1)
                      : transformKnobValue(
                          knobValue,
                          knobTransformRange
                        ).toFixed(0)
                  } ${knobUnits}`
              : knobTitle}
          </Text>
        </Center>
      </Box>
    </>
  );
};
