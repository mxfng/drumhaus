"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

import { MASTER_FILTER_RANGE } from "@/lib/audio/engine/constants";

// Knob Value & Transform Constants
const KNOB_MAX_VALUE = 100;
const KNOB_MIN_VALUE = 0;
const KNOB_DEFAULT_VALUE = 50;
const KNOB_DEFAULT_TRANSFORM_RANGE: [number, number] = [0, KNOB_MAX_VALUE];
const KNOB_EXPONENTIAL_CURVE_POWER = 2;

// Knob Rotation & Range Constants
const KNOB_ROTATION_RANGE_DEGREES: [number, number] = [-225, 45];
const KNOB_ROTATION_ORIGIN = 0.5;
export const KNOB_ROTATION_THRESHOLD_L = 49;
export const KNOB_ROTATION_THRESHOLD_R = 50;

// Move/Event Options
const KNOB_MOVE_EVENT_OPTIONS: AddEventListenerOptions = { passive: false };

// Layout & Sizing Constants
const KNOB_CONTAINER_PADDING = 30;
const KNOB_MASK_PADDING = 10;
const KNOB_WRAPPER_MARGIN = 8; // equivalent to Chakra m={2}
const FULL_BORDER_RADIUS = 9999;
const CENTER_FLEX_STYLE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

// Ticking/Markings
const KNOB_TICK_WIDTH_DIVISOR = 4;
const KNOB_TICK_HEIGHT_DIVISOR = 12;
const KNOB_TICK_BORDER_RADIUS = "0 8px 8px 0";

// Dot Indicator
const KNOB_DOT_MIN_ROTATION = -180;
const KNOB_DOT_MAX_ROTATION = 90;
const KNOB_DOT_SIZE = 4;
const KNOB_DOT_OPACITY = 0.3;
const KNOB_DOT_SHADOW = "0 4px 12px rgba(176, 147, 116, 0.6)";

// Label Styling
const KNOB_LABEL_FONT_SIZE = 12;
const KNOB_LABEL_MARGIN_Y = -10;

// Z-Index
const KNOB_HITBOX_Z_INDEX = 2;
const KNOB_TICK_Z_INDEX = 3;

// Filter Labels
const KNOB_FILTER_LOW_LABEL = "LP";
const KNOB_FILTER_HIGH_LABEL = "HP";

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
  valueStep?: number;
  displayValueFormatter?: (value: number) => string;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const quantizeToStep = (value: number, step: number) => {
  const normalizedStep = step > 0 ? step : 1;
  return Math.round(value / normalizedStep) * normalizedStep;
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
  const shouldUseLowRange = input <= KNOB_ROTATION_THRESHOLD_L;
  const [min, max] = shouldUseLowRange ? rangeLow : rangeHigh;
  const newInput =
    ((shouldUseLowRange ? input : input - KNOB_ROTATION_THRESHOLD_R) /
      KNOB_ROTATION_THRESHOLD_L) *
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
  knobTransformRange = KNOB_DEFAULT_TRANSFORM_RANGE,
  knobUnits = "",
  exponential = false,
  filter = false,
  defaultValue = KNOB_DEFAULT_VALUE,
  isDisabled = false,
  valueStep = 1,
  displayValueFormatter,
}) => {
  const [isMoving, setIsMoving] = useState(false);
  const moveStartYRef = useRef(0);
  const stepSize = valueStep > 0 ? valueStep : 1;
  const initialQuantizedValue = quantizeToStep(knobValue, stepSize);
  const startValueRef = useRef(initialQuantizedValue);

  const moveY = useMotionValue(initialQuantizedValue);
  const rotation = useTransform(
    moveY,
    [KNOB_MIN_VALUE, KNOB_MAX_VALUE],
    KNOB_ROTATION_RANGE_DEGREES,
  );

  const immutableDefaultValue = defaultValue;
  const handleMoveEnd = useCallback(() => {
    setIsMoving(false);
  }, [setIsMoving]);

  useEffect(() => {
    // Sync motion value when knob is updated externally (e.g. presets/kits)
    if (isMoving) return;

    const quantizedValue = quantizeToStep(knobValue, stepSize);
    moveY.set(quantizedValue);
    startValueRef.current = quantizedValue;
  }, [isMoving, knobValue, moveY, stepSize]);

  useEffect(() => {
    const setValueOnMove = (ev: MouseEvent | TouchEvent) => {
      ev.preventDefault();
      if (!isMoving || isDisabled) return;

      const clientY = "touches" in ev ? ev.touches[0].clientY : ev.clientY;
      const deltaY = moveStartYRef.current - clientY;
      const newKnobValue = clamp(
        startValueRef.current + deltaY,
        KNOB_MIN_VALUE,
        KNOB_MAX_VALUE,
      );
      const quantizedKnobValue = quantizeToStep(newKnobValue, stepSize);

      moveY.set(quantizedKnobValue);
      setKnobValue(quantizedKnobValue);
    };

    if (isMoving && !isDisabled) {
      window.addEventListener("mousemove", setValueOnMove);
      window.addEventListener(
        "touchmove",
        setValueOnMove,
        KNOB_MOVE_EVENT_OPTIONS,
      );
      window.addEventListener("mouseup", handleMoveEnd);
      window.addEventListener("touchend", handleMoveEnd);
    } else {
      window.removeEventListener("mousemove", setValueOnMove);
      window.removeEventListener(
        "touchmove",
        setValueOnMove,
        KNOB_MOVE_EVENT_OPTIONS,
      );
      window.removeEventListener("mouseup", handleMoveEnd);
      window.removeEventListener("touchend", handleMoveEnd);
    }

    return () => {
      window.removeEventListener("mousemove", setValueOnMove);
      window.removeEventListener(
        "touchmove",
        setValueOnMove,
        KNOB_MOVE_EVENT_OPTIONS,
      );
      window.removeEventListener("mouseup", handleMoveEnd);
      window.removeEventListener("touchend", handleMoveEnd);
    };
  }, [handleMoveEnd, isDisabled, isMoving, moveY, setKnobValue, stepSize]);

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
    moveStartYRef.current =
      "touches" in ev ? ev.touches[0].clientY : ev.clientY;
    startValueRef.current = quantizeToStep(knobValue, stepSize);
  };

  const handleDoubleClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    ev.preventDefault();
    setKnobValue(immutableDefaultValue);
  };

  const formatWithUnits = (value: string | number) =>
    `${value}${knobUnits ? ` ${knobUnits}` : ""}`;

  const formatScaledValue = (value: number) => {
    const transform = exponential
      ? transformKnobValueExponential
      : transformKnobValue;
    const decimals = knobUnits ? 1 : 0;
    const transformedValue = transform(value, knobTransformRange).toFixed(
      decimals,
    );
    return formatWithUnits(transformedValue);
  };

  const formatFilterValue = (value: number) => {
    const filterValue = transformKnobFilterValue(value).toFixed(0);
    const modeLabel =
      value <= KNOB_ROTATION_THRESHOLD_L
        ? KNOB_FILTER_LOW_LABEL
        : KNOB_FILTER_HIGH_LABEL;

    return `${formatWithUnits(filterValue)} ${modeLabel}`;
  };

  const getDisplayLabel = (value: number) => {
    if (!isMoving) return knobTitle;
    if (displayValueFormatter) return displayValueFormatter(value);
    if (filter) return formatFilterValue(value);
    return formatScaledValue(value);
  };

  const knobContainerHeight = size + KNOB_CONTAINER_PADDING;
  const knobMaskSize = size + KNOB_MASK_PADDING;

  return (
    <div style={{ height: `${knobContainerHeight}px` }}>
      <div style={CENTER_FLEX_STYLE}>
        <div
          key="knob-mask"
          style={{
            width: `${knobMaskSize}px`,
            height: `${knobMaskSize}px`,
            margin: `${KNOB_WRAPPER_MARGIN}px`,
            position: "relative",
            rotate: "90deg",
          }}
        >
          <div
            style={{
              ...CENTER_FLEX_STYLE,
              width: "100%",
              height: "100%",
              borderRadius: FULL_BORDER_RADIUS,
              cursor: isDisabled ? "not-allowed" : "grab",
            }}
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
              <div style={CENTER_FLEX_STYLE}>
                <div
                  className="knob-tick"
                  style={{
                    ...CENTER_FLEX_STYLE,
                    height: `${size}px`,
                    width: `${size}px`,
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: KNOB_TICK_Z_INDEX,
                  }}
                >
                  <div
                    style={{
                      width: `${size / KNOB_TICK_WIDTH_DIVISOR}px`,
                      height: `${Math.floor(size / KNOB_TICK_HEIGHT_DIVISOR)}px`,
                      background: "darkorange",
                      transform: "rotate(90deg) translate(50%, 50%)",
                      borderRadius: KNOB_TICK_BORDER_RADIUS,
                    }}
                  />
                </div>
              </div>
            </motion.div>
            <div
              className="neumorphicTallRaised"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                position: "relative",
                borderRadius: FULL_BORDER_RADIUS,
              }}
            />
            <motion.div
              className="knob-dot-min-transform"
              style={{
                rotate: KNOB_DOT_MIN_ROTATION,
                width: `${size}px`,
                height: `${size}px`,
                originX: KNOB_ROTATION_ORIGIN,
                originY: KNOB_ROTATION_ORIGIN,
                position: "absolute",
              }}
            >
              <div
                className="knob-dot-min"
                style={{
                  width: `${KNOB_DOT_SIZE}px`,
                  height: `${KNOB_DOT_SIZE}px`,
                  background: "gray",
                  position: "absolute",
                  borderRadius: FULL_BORDER_RADIUS,
                  opacity: KNOB_DOT_OPACITY,
                }}
              />
            </motion.div>
            <motion.div
              className="knob-dot-max-transform"
              style={{
                rotate: KNOB_DOT_MAX_ROTATION,
                width: `${size}px`,
                height: `${size}px`,
                originX: KNOB_ROTATION_ORIGIN,
                originY: KNOB_ROTATION_ORIGIN,
                position: "absolute",
              }}
            >
              <div
                className="knob-dot-max"
                style={{
                  width: `${KNOB_DOT_SIZE}px`,
                  height: `${KNOB_DOT_SIZE}px`,
                  background: "gray",
                  position: "absolute",
                  borderRadius: FULL_BORDER_RADIUS,
                  opacity: KNOB_DOT_OPACITY,
                  boxShadow: KNOB_DOT_SHADOW,
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>
      <div style={CENTER_FLEX_STYLE}>
        <div
          style={{
            fontSize: `${KNOB_LABEL_FONT_SIZE}px`,
            color: "#B09374",
            marginTop: `${KNOB_LABEL_MARGIN_Y}px`,
            marginBottom: `${KNOB_LABEL_MARGIN_Y}px`,
          }}
        >
          {getDisplayLabel(knobValue)}
        </div>
      </div>
    </div>
  );
};
