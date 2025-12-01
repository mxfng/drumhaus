import React, { useCallback, useEffect, useRef, useState } from "react";
import { useMotionValue, useTransform } from "framer-motion";

import { clamp, quantize } from "@/shared/lib/utils";
import {
  KNOB_ROTATION_RANGE_DEGREES,
  KNOB_SENSITIVITY,
  KNOB_VALUE_DEFAULT,
  KNOB_VALUE_MAX,
  KNOB_VALUE_MIN,
} from "../lib/constants";
import { useKnobGuidance } from "./useKnobGuidance";

interface UseKnobControlsParams {
  value: number;
  stepSize?: number;
  onValueChange: (value: number) => void;
  defaultValue?: number;
  disabled?: boolean;
  label: string;
  activeLabel?: string;
}

/**
 * Centralized interaction/motion logic for the knob UI.
 *
 * - Manages drag lifecycle (pointer events), quantization, and rotation motion value
 * - Keeps tooltip side/content in sync
 * - Delegates first-use guidance to `useKnobGuidance`
 */
export function useKnobControls({
  value,
  stepSize = KNOB_VALUE_DEFAULT,
  onValueChange,
  defaultValue = KNOB_VALUE_DEFAULT,
  disabled = false,
  label,
  activeLabel,
}: UseKnobControlsParams) {
  const quantizedValue = quantize(value, stepSize);

  const initMoveYRef = useRef(0);
  const initValueRef = useRef(quantizedValue);
  const knobContainerRef = useRef<HTMLDivElement>(null);

  const [isMoving, setIsMoving] = useState(false);
  const [tooltipSide, setTooltipSide] = useState<"left" | "right">("right");

  const { showCoachmark, handleStart, handleMove, handleEnd } =
    useKnobGuidance();

  const moveY = useMotionValue(quantizedValue);

  const rotation = useTransform(
    moveY,
    [KNOB_VALUE_MIN, KNOB_VALUE_MAX],
    KNOB_ROTATION_RANGE_DEGREES,
  );

  const updateTooltipSide = useCallback(() => {
    const node = knobContainerRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const spaceLeft = rect.left;
    const spaceRight = window.innerWidth - rect.right;

    setTooltipSide(spaceLeft > spaceRight ? "left" : "right");
  }, []);

  const handlePointerDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;

    ev.preventDefault();

    updateTooltipSide();
    setIsMoving(true);
    handleStart({ x: ev.clientX, y: ev.clientY });
    initMoveYRef.current = ev.clientY;
    initValueRef.current = quantize(value, stepSize);
    ev.currentTarget.setPointerCapture(ev.pointerId);
  };

  const handlePointerMove = useCallback(
    (ev: PointerEvent) => {
      if (!isMoving) return;

      ev.preventDefault();

      const clientY = ev.clientY;
      const clientX = ev.clientX;
      const deltaY = (initMoveYRef.current - clientY) * KNOB_SENSITIVITY;

      const newValue = clamp(
        initValueRef.current + deltaY,
        KNOB_VALUE_MIN,
        KNOB_VALUE_MAX,
      );

      const q = quantize(newValue, stepSize);

      moveY.set(q);
      onValueChange(q);
      handleMove({ x: clientX, y: clientY });
    },
    [isMoving, initMoveYRef, stepSize, onValueChange, moveY, handleMove],
  );

  const handlePointerUp = useCallback(
    (ev: PointerEvent) => {
      setIsMoving(false);
      handleEnd({ x: ev.clientX, y: ev.clientY });
      if (ev.target instanceof HTMLElement) {
        try {
          ev.target.releasePointerCapture(ev.pointerId);
        } catch {
          // Do nothing
        }
      }
    },
    [handleEnd],
  );

  const handleDoubleClick = (ev: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;

    ev.preventDefault();
    onValueChange(defaultValue);
  };

  useEffect(() => {
    const handleResize = () => updateTooltipSide();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [updateTooltipSide]);

  useEffect(() => {
    if (disabled) return;

    const opts: AddEventListenerOptions = {
      passive: false,
    };

    if (isMoving) {
      window.addEventListener("pointermove", handlePointerMove, opts);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    }

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [isMoving, disabled, handlePointerMove, handlePointerUp]);

  useEffect(() => {
    if (isMoving) return;

    const quantized = quantize(value, stepSize);
    moveY.set(quantized);

    initMoveYRef.current = 0;
    initValueRef.current = quantized;
  }, [isMoving, value, moveY, stepSize]);

  useEffect(() => {
    return () => setIsMoving(false);
  }, []);

  const tooltipContent = activeLabel ?? label;

  return {
    rotation,
    handlePointerDown,
    handleDoubleClick,
    isMoving,
    tooltipSide,
    tooltipContent,
    knobContainerRef,
    showCoachmark,
  };
}
