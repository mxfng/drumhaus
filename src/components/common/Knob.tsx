"use client";

import { useEffect, useState } from "react";
import { Box, Center, Text } from "@chakra-ui/react";
import { motion, useMotionValue, useTransform } from "framer-motion";

import { MASTER_FILTER_RANGE } from "@/lib/audio/engine/constants";

export const KNOB_NEUTRAL_BREAKPOINT_LOW = 49;
const KNOB_NEUTRAL_BREAKPOINT_HIGH = 50;
const KNOB_FILTER_MODE_THRESHOLD = KNOB_NEUTRAL_BREAKPOINT_LOW;
const KNOB_MAX_VALUE = 100;
const KNOB_MIN_VALUE = 0;
const DEFAULT_KNOB_VALUE = 50;
const KNOB_ROTATION_RANGE_DEGREES: [number, number] = [-225, 45];
const KNOB_ROTATION_ORIGIN = 0.5;
const KNOB_CONTAINER_PADDING = 30;
const KNOB_MASK_PADDING = 10;
const KNOB_WRAPPER_MARGIN = 2;
const KNOB_TICK_WIDTH_DIVISOR = 4;
const KNOB_TICK_HEIGHT_DIVISOR = 12;
const KNOB_TICK_BORDER_RADIUS = "8px 0 0 8px";
const KNOB_DOT_SIZE = 4;
const KNOB_DOT_OPACITY = 0.3;
const KNOB_DOT_SHADOW = "0 4px 12px rgba(176, 147, 116, 0.6)";
const KNOB_LABEL_FONT_SIZE = 12;
const KNOB_LABEL_MARGIN_Y = -3;
const KNOB_MIN_DOT_ROTATION = -180;
const KNOB_MAX_DOT_ROTATION = 90;
const KNOB_HITBOX_Z_INDEX = 2;
const KNOB_TICK_Z_INDEX = 3;
const KNOB_EXPONENTIAL_CURVE_POWER = 2;

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
  isDisabled?: boolean;
};

// Transform knob values (0-100) to any Tone.js parameter range [min, max]
export const transformKnobValue = (
  input: number,
  range: [number, number],
): number => {
  const [newRangeMin, newRangeMax] = range;
  const scalingFactor = (newRangeMax - newRangeMin) / KNOB_MAX_VALUE;
  return scalingFactor * input + newRangeMin;
};

export const transformKnobFilterValue = (
  input: number,
  rangeLow: [number, number] = MASTER_FILTER_RANGE,
  rangeHigh: [number, number] = MASTER_FILTER_RANGE,
): number => {
  const shouldUseLowRange = input <= KNOB_FILTER_MODE_THRESHOLD;
  const [min, max] = shouldUseLowRange ? rangeLow : rangeHigh;
  const newInput =
    ((shouldUseLowRange ? input : input - KNOB_NEUTRAL_BREAKPOINT_HIGH) /
      KNOB_NEUTRAL_BREAKPOINT_LOW) *
    KNOB_MAX_VALUE;
  return transformKnobValueExponential(newInput, [min, max]);
};

export const transformKnobValueExponential = (
  input: number,
  range: [number, number],
): number => {
  const inputMin = KNOB_MIN_VALUE;
  const inputMax = KNOB_MAX_VALUE;
  const [outputMin, outputMax] = range;

  const normalizedInput = (input - inputMin) / (inputMax - inputMin);
  const exponentialValue = Math.pow(
    normalizedInput,
    KNOB_EXPONENTIAL_CURVE_POWER,
  );
  const mappedValue = outputMin + exponentialValue * (outputMax - outputMin);

  return mappedValue;
};

export const Knob: React.FC<KnobProps> = ({
  size,
  knobValue,
  setKnobValue,
  knobTitle,
  knobTransformRange = [0, KNOB_MAX_VALUE],
  knobUnits = "",
  exponential = false,
  filter = false,
  defaultValue = DEFAULT_KNOB_VALUE,
  isDisabled = false,
}) => {
  const [isMoving, setIsMoving] = useState(false);
  const [moveStartY, setMoveStartY] = useState({ x: 0, y: 0 });

  const moveY = useMotionValue(knobValue);
  const rotation = useTransform(
    moveY,
    [KNOB_MIN_VALUE, KNOB_MAX_VALUE],
    KNOB_ROTATION_RANGE_DEGREES,
  );

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
      if (isMoving && !isDisabled) {
        const clientY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
        const newKnobValue = Math.max(
          KNOB_MIN_VALUE,
          Math.min(moveStartY.y - clientY + knobValue, KNOB_MAX_VALUE),
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
  }, [isMoving, isDisabled]);

  useEffect(() => {
    return () => {
      setIsMoving(false);
    };
  }, []);

  const captureMoveStartY = (
    ev: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>,
  ) => {
    if (isDisabled) return;
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
    if (isDisabled) return;
    ev.preventDefault();
    setKnobValue(immutableDefaultValue);
  };

  return (
    <>
      <Box h={`${size + KNOB_CONTAINER_PADDING}px`}>
        <Center>
          <Box
            key="knob-mask"
            w={`${size + KNOB_MASK_PADDING}px`}
            h={`${size + KNOB_MASK_PADDING}px`}
            m={KNOB_WRAPPER_MARGIN}
            position="relative"
          >
            <Center
              w="100%"
              h="100%"
              borderRadius="full"
              cursor={isDisabled ? "not-allowed" : "grab"}
            >
              <motion.div
                className="knob-hitbox"
                onMouseDown={isDisabled ? undefined : captureMoveStartY}
                onTouchStart={isDisabled ? undefined : captureMoveStartY}
                onDoubleClick={isDisabled ? undefined : handleDoubleClick}
                style={{
                  rotate: rotation,
                  width: `${size}px`,
                  height: `${size}px`,
                  originX: KNOB_ROTATION_ORIGIN,
                  originY: KNOB_ROTATION_ORIGIN,
                  position: "absolute",
                  zIndex: KNOB_HITBOX_Z_INDEX,
                  borderRadius: size,
                  pointerEvents: isDisabled ? "none" : "auto",
                }}
              >
                <Center h="100%" w="100%">
                  <Center
                    className="knob-tick"
                    h={`${size}px`}
                    w={`${size}px`}
                    position="absolute"
                    pointerEvents="none"
                    zIndex={KNOB_TICK_Z_INDEX}
                  >
                    <Box
                      w={`${size / KNOB_TICK_WIDTH_DIVISOR}px`}
                      h={`${Math.floor(size / KNOB_TICK_HEIGHT_DIVISOR)}px`}
                      bg="darkorange"
                      position="absolute"
                      right={0}
                      borderRadius={KNOB_TICK_BORDER_RADIUS}
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
                  rotate: KNOB_MIN_DOT_ROTATION,
                  width: `${size}px`,
                  height: `${size}px`,
                  originX: KNOB_ROTATION_ORIGIN,
                  originY: KNOB_ROTATION_ORIGIN,
                  position: "absolute",
                }}
              >
                <Box
                  className="knob-dot-min"
                  w={`${KNOB_DOT_SIZE}px`}
                  h={`${KNOB_DOT_SIZE}px`}
                  bg="gray"
                  position="absolute"
                  borderRadius="full"
                  opacity={KNOB_DOT_OPACITY}
                  right={0}
                />
              </motion.div>
              <motion.div
                className="knob-dot-max-transform"
                style={{
                  rotate: KNOB_MAX_DOT_ROTATION,
                  width: `${size}px`,
                  height: `${size}px`,
                  originX: KNOB_ROTATION_ORIGIN,
                  originY: KNOB_ROTATION_ORIGIN,
                  position: "absolute",
                }}
              >
                <Box
                  className="knob-dot-max"
                  w={`${KNOB_DOT_SIZE}px`}
                  h={`${KNOB_DOT_SIZE}px`}
                  bg="gray"
                  position="absolute"
                  borderRadius="full"
                  opacity={KNOB_DOT_OPACITY}
                  right={0}
                  boxShadow={KNOB_DOT_SHADOW}
                />
              </motion.div>
            </Center>
          </Box>
        </Center>
        <Center>
          <Text
            fontSize={KNOB_LABEL_FONT_SIZE}
            color="gray"
            my={KNOB_LABEL_MARGIN_Y}
          >
            {isMoving
              ? filter
                ? `${transformKnobFilterValue(knobValue).toFixed(
                    0,
                  )} ${knobUnits} ${knobValue <= KNOB_FILTER_MODE_THRESHOLD ? "LP" : "HP"}`
                : exponential
                  ? `${
                      knobUnits
                        ? transformKnobValueExponential(
                            knobValue,
                            knobTransformRange,
                          ).toFixed(1)
                        : transformKnobValueExponential(
                            knobValue,
                            knobTransformRange,
                          ).toFixed(0)
                    } ${knobUnits}`
                  : `${
                      knobUnits
                        ? transformKnobValue(
                            knobValue,
                            knobTransformRange,
                          ).toFixed(1)
                        : transformKnobValue(
                            knobValue,
                            knobTransformRange,
                          ).toFixed(0)
                    } ${knobUnits}`
              : knobTitle}
          </Text>
        </Center>
      </Box>
    </>
  );
};
