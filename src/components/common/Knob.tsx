import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

import { MASTER_FILTER_RANGE } from "@/lib/audio/engine/constants";
import { Label } from "../ui";
import {
  KNOB_ROTATION_THRESHOLD_L,
  transformKnobFilterValue,
  transformKnobValue,
  transformKnobValueExponential,
} from "./knobTransforms";

// Knob Value & Transform Constants
const KNOB_MAX_VALUE = 100;
const KNOB_MIN_VALUE = 0;
const KNOB_DEFAULT_VALUE = 50;
const KNOB_DEFAULT_TRANSFORM_RANGE: [number, number] = [0, KNOB_MAX_VALUE];

// Knob Rotation & Range Constants
const KNOB_ROTATION_RANGE_DEGREES: [number, number] = [-225, 45];
const KNOB_ROTATION_ORIGIN = 0.5;

// Move/Event Options
const KNOB_MOVE_EVENT_OPTIONS: AddEventListenerOptions = { passive: false };

// Layout & Sizing Constants
const KNOB_CONTAINER_PADDING = 30;
const KNOB_MASK_PADDING = 10;

// Ticking/Markings
const KNOB_TICK_WIDTH_DIVISOR = 4;
const KNOB_TICK_HEIGHT_DIVISOR = 12;

// Dot Indicator
const KNOB_DOT_MIN_ROTATION = -180;
const KNOB_DOT_MAX_ROTATION = 90;

// Filter Labels
const KNOB_FILTER_LOW_LABEL = "LP";
const KNOB_FILTER_HIGH_LABEL = "HP";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const quantizeToStep = (value: number, step: number) => {
  const normalizedStep = step > 0 ? step : 1;
  return Math.round(value / normalizedStep) * normalizedStep;
};

// Sub-components for better readability
type KnobTickProps = {
  size: number;
};

const KnobTick: React.FC<KnobTickProps> = ({ size }) => (
  <div className="flex items-center justify-center">
    <div
      className="pointer-events-none absolute z-[3] flex items-center justify-center"
      style={{ height: `${size}px`, width: `${size}px` }}
    >
      <div
        className="bg-primary rounded-[0_8px_8px_0]"
        style={{
          width: `${size / KNOB_TICK_WIDTH_DIVISOR}px`,
          height: `${Math.floor(size / KNOB_TICK_HEIGHT_DIVISOR)}px`,
          transform: "rotate(90deg) translate(50%, 50%)",
          boxShadow: `
            inset -1px -1px 2px var(--color-shadow-60),
            inset 1px 1px 1px var(--color-highlight-30)
          `,
        }}
      />
    </div>
  </div>
);

type KnobDotProps = {
  size: number;
  rotation: number;
  withShadow?: boolean;
};

const KnobDot: React.FC<KnobDotProps> = ({ size, rotation, withShadow }) => (
  <motion.div
    className="absolute"
    style={{
      rotate: rotation,
      width: `${size}px`,
      height: `${size}px`,
      originX: KNOB_ROTATION_ORIGIN,
      originY: KNOB_ROTATION_ORIGIN,
    }}
  >
    <div
      className={`bg-shadow absolute h-1 w-1 rounded-full opacity-30 ${
        withShadow ? "shadow-[0_4px_12px_var(--color-shadow-60)]" : ""
      }`}
    />
  </motion.div>
);

type KnobBodyProps = {
  size: number;
};

const KnobBody: React.FC<KnobBodyProps> = ({ size }) => (
  <div
    className="relative rounded-full"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      boxShadow: "var(--knob-shadow)",
      background: "var(--knob-gradient)",
    }}
  />
);

export type KnobScale = "linear" | "exp" | "split-filter";
export type KnobSize = "sm" | "md" | "lg";

type KnobProps = {
  value: number;
  onChange: (newState: number) => void;

  label?: string;
  units?: string;

  range?: [number, number];
  min?: number;
  max?: number;

  scale?: KnobScale;

  step?: number;
  defaultValue?: number;

  disabled?: boolean;
  size?: KnobSize;

  formatValue?: (value: number) => string;
  onDoubleClickReset?: () => void;

  ariaLabel?: string;
};

export const Knob: React.FC<KnobProps> = ({
  value,
  onChange,
  label,
  units = "",
  range,
  min,
  max,
  scale = "linear",
  step: valueStep = 1,
  defaultValue = KNOB_DEFAULT_VALUE,
  disabled: isDisabled = false,
  size = "md",
  formatValue,
  onDoubleClickReset,
  ariaLabel,
}) => {
  // Convert size enum to pixel values
  const sizeInPixels = size === "lg" ? 140 : size === "md" ? 60 : 50;

  const explicitRange: [number, number] | undefined =
    range && range.length === 2
      ? [range[0], range[1]]
      : min !== undefined && max !== undefined
        ? [min, max]
        : undefined;
  const knobTransformRange: [number, number] =
    explicitRange ?? KNOB_DEFAULT_TRANSFORM_RANGE;
  const filterTransformRange: [number, number] =
    explicitRange ?? MASTER_FILTER_RANGE;
  const isSplitFilterScale = scale === "split-filter";
  const isExponentialScale = scale === "exp";

  const [isMoving, setIsMoving] = useState(false);
  const moveStartYRef = useRef(0);
  const stepSize = valueStep > 0 ? valueStep : 1;
  const initialQuantizedValue = quantizeToStep(value, stepSize);
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

    const quantizedValue = quantizeToStep(value, stepSize);
    moveY.set(quantizedValue);
    startValueRef.current = quantizedValue;
  }, [isMoving, value, moveY, stepSize]);

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
      onChange(quantizedKnobValue);
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
  }, [handleMoveEnd, isDisabled, isMoving, moveY, onChange, stepSize]);

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
    startValueRef.current = quantizeToStep(value, stepSize);
  };

  const handleDoubleClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (isDisabled) return;
    ev.preventDefault();
    if (onDoubleClickReset) {
      onDoubleClickReset();
      return;
    }
    onChange(immutableDefaultValue);
  };

  const formatWithUnits = (value: string | number) =>
    `${value}${units ? ` ${units}` : ""}`;

  const formatScaledValue = (value: number) => {
    const transform = isExponentialScale
      ? transformKnobValueExponential
      : transformKnobValue;
    const decimals = units ? 1 : 0;
    const transformedValue = transform(value, knobTransformRange).toFixed(
      decimals,
    );
    return formatWithUnits(transformedValue);
  };

  const formatFilterValue = (value: number) => {
    const filterValue = transformKnobFilterValue(
      value,
      filterTransformRange,
      filterTransformRange,
    ).toFixed(0);
    const modeLabel =
      value <= KNOB_ROTATION_THRESHOLD_L
        ? KNOB_FILTER_LOW_LABEL
        : KNOB_FILTER_HIGH_LABEL;

    return `${formatWithUnits(filterValue)} ${modeLabel}`;
  };

  const getDisplayLabel = (value: number) => {
    if (!isMoving) return label;
    if (formatValue) return formatValue(value);
    if (isSplitFilterScale) return formatFilterValue(value);
    return formatScaledValue(value);
  };

  // Computed sizes
  const containerHeight = sizeInPixels + KNOB_CONTAINER_PADDING;
  const maskSize = sizeInPixels + KNOB_MASK_PADDING;

  // Shared size style for elements that need dynamic pixel dimensions
  const sizeStyle = { width: `${sizeInPixels}px`, height: `${sizeInPixels}px` };

  return (
    <div style={{ height: `${containerHeight}px` }}>
      {/* Knob Container */}
      <div className="flex items-center justify-center">
        <div
          className="relative m-2 rotate-90"
          style={{ width: `${maskSize}px`, height: `${maskSize}px` }}
        >
          {/* Interaction Area */}
          <div
            className={`flex h-full w-full items-center justify-center rounded-full ${
              isDisabled ? "cursor-not-allowed" : "cursor-grab"
            }`}
          >
            {/* Rotatable Hitbox */}
            <motion.div
              className={`absolute z-2 rounded-full ${
                isDisabled ? "pointer-events-none" : "pointer-events-auto"
              }`}
              onMouseDown={isDisabled ? undefined : captureMoveStartY}
              onTouchStart={isDisabled ? undefined : captureMoveStartY}
              onDoubleClick={isDisabled ? undefined : handleDoubleClick}
              aria-label={ariaLabel ?? label}
              aria-valuemin={KNOB_MIN_VALUE}
              aria-valuemax={KNOB_MAX_VALUE}
              aria-valuenow={value}
              style={{
                rotate: rotation,
                originX: KNOB_ROTATION_ORIGIN,
                originY: KNOB_ROTATION_ORIGIN,
                ...sizeStyle,
              }}
            >
              <KnobTick size={sizeInPixels} />
            </motion.div>

            {/* Visual Elements */}
            <KnobBody size={sizeInPixels} />
            <KnobDot size={sizeInPixels} rotation={KNOB_DOT_MIN_ROTATION} />
            <KnobDot
              size={sizeInPixels}
              rotation={KNOB_DOT_MAX_ROTATION}
              withShadow
            />
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="flex items-center justify-center">
        <Label className="-my-1.5">{getDisplayLabel(value)}</Label>
      </div>
    </div>
  );
};
