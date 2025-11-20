"use client";

import React, { useEffect, useRef, useState } from "react";
import { Box, Center, Grid, GridItem, Text } from "@chakra-ui/react";

import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";

const STEP_BOXES_GAP = 12;
const NUM_OF_STEPS = 16;

export const Sequencer: React.FC = () => {
  // Get playback state from Transport Store
  const currentStepIndex = useTransportStore((state) => state.stepIndex);
  const isPlaying = useTransportStore((state) => state.isPlaying);

  // Get sequencer state from Sequencer Store
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const triggers = usePatternStore(
    (state) => state.pattern[voiceIndex].variations[variation].triggers,
  );
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const setVelocity = usePatternStore((state) => state.setVelocity);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragWriteTargetOn, setDragWriteTargetOn] = useState<boolean>(true);
  const [isAdjustingVelocity, setIsAdjustingVelocity] =
    useState<boolean>(false);
  const sequencerRef = useRef<HTMLDivElement | null>(null);

  const currentVariation = pattern[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
  const stepHeight = 1538 / NUM_OF_STEPS - STEP_BOXES_GAP;
  const stepRadius = `${stepHeight / 4}px`;
  const steps = Array.from({ length: NUM_OF_STEPS }, (_, index) => index);

  const updateVelocityFromPointer = (
    event: React.MouseEvent<HTMLDivElement>,
    stepIndex: number,
  ) => {
    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const divWidth = rect.width;
    const normalizedVelocity = Math.max(Math.min(mouseX / divWidth, 1), 0);
    setVelocity(voiceIndex, variation, stepIndex, normalizedVelocity);
  };

  const handleVelocityMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    stepIndex: number,
  ) => {
    setIsDragging(true);
    setIsAdjustingVelocity(true);
    updateVelocityFromPointer(event, stepIndex);
  };

  const handleVelocityMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
    stepIndex: number,
  ) => {
    if (isDragging && isAdjustingVelocity) {
      updateVelocityFromPointer(event, stepIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsAdjustingVelocity(false);
  };

  const handleToggleStep = (index: number) => {
    toggleStep(voiceIndex, variation, index);
  };

  const handleStepMouseDown = (stepIndex: number, isCurrentlyOn: boolean) => {
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    handleToggleStep(stepIndex);
  };

  const handleStepMouseEnter = (stepIndex: number, isCurrentlyOn: boolean) => {
    const isStateChanging = isCurrentlyOn !== dragWriteTargetOn;
    if (isDragging && isStateChanging && !isAdjustingVelocity) {
      handleToggleStep(stepIndex);
    }
  };

  const getStepVisualState = (step: number) => {
    const isTriggerOn = triggers[step];
    const isActiveStep =
      isPlaying && playbackVariation === variation && currentStepIndex === step;
    const isAccentStep = step % 4 === 0;
    const isGhosted =
      isPlaying && playbackVariation !== variation && isTriggerOn;

    return {
      isTriggerOn,
      indicatorBg: isActiveStep ? "darkorange" : "gray",
      indicatorOpacity: isActiveStep ? 1 : isAccentStep ? 0.6 : 0.2,
      triggerBg: isTriggerOn ? "darkorange" : "#E8E3DD",
      triggerOpacity: isGhosted ? 0.7 : 1,
      triggerShadow: isTriggerOn
        ? "3px 3px 9px rgba(176, 147, 116, 0.6), -3px -3px 9px rgba(251, 245, 255, 0.3)"
        : "0 4px 8px rgba(176, 147, 116, 1) inset",
      velocityValue: velocities[step],
    };
  };

  // Track mouseup events for drag painting step triggers.
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Reset mouse down state when the component unmounts.
  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, []);

  return (
    <Box w="100%" ref={sequencerRef}>
      <Grid
        key="sequence-grid"
        templateColumns={`repeat(${NUM_OF_STEPS}, 1fr)`}
        w="100%"
        h="100%"
        gap={`${STEP_BOXES_GAP}px`}
      >
        {steps.map((step) => {
          const {
            indicatorBg,
            indicatorOpacity,
            isTriggerOn,
            triggerBg,
            triggerOpacity,
            triggerShadow,
            velocityValue,
          } = getStepVisualState(step);

          const velocityWidth = Math.max(velocityValue * 100, 12);

          return (
            <GridItem key={`sequence-step-item-${step}`} colSpan={1}>
              <Box
                key={`sequence-step-indicator-${step}`}
                mb={4}
                h="4px"
                w="100%"
                opacity={indicatorOpacity}
                bg={indicatorBg}
              />
              <Box
                key={`sequence-step-trigger-${step}`}
                onMouseDown={() => handleStepMouseDown(step, isTriggerOn)}
                onMouseEnter={() => handleStepMouseEnter(step, isTriggerOn)}
                onContextMenu={(e) => e.preventDefault()}
                w="100%"
                h={`${stepHeight}px`}
                bg={triggerBg}
                transition="all 0.3s ease"
                opacity={triggerOpacity}
                borderRadius={`0 ${stepRadius} 0 ${stepRadius}`}
                cursor="pointer"
                _hover={{
                  background: isTriggerOn ? "darkorange" : "darkorangehover",
                  transition: "all 0.3s ease",
                  boxShadow: triggerShadow,
                }}
                boxShadow={triggerShadow}
              />
              <Box
                key={`sequence-step-velocity-${step}`}
                w="100%"
                h="14px"
                mt={3}
                bg="transparent"
                transition="all 0.2s ease"
                opacity={isTriggerOn ? 0.6 : 0}
                outline="1px solid darkorange"
                transform="opacity 0.2s ease"
                position="relative"
                onMouseDown={(ev) => handleVelocityMouseDown(ev, step)}
                onMouseMove={(ev) => handleVelocityMouseMove(ev, step)}
                _hover={{
                  "& p": {
                    opacity: 1,
                  },
                  "& .text": {
                    filter: "blur(0px)",
                  },
                }}
                borderRadius="200px 0 200px 0"
              >
                <Box
                  bg="darkorange"
                  h="100%"
                  w={`${velocityWidth}%`}
                  position="absolute"
                  borderRadius="200px 0 200px 0"
                  filter="blur(2px)"
                />
                <Center position="absolute" h="100%" w="100%">
                  <Text
                    className="text"
                    color="brown"
                    fontFamily={`'Pixelify Sans Variable', sans-serif`}
                    opacity={0}
                    transition="0.5s ease"
                    filter="blur(2px)"
                  >
                    {(velocityValue * 100).toFixed(0)}
                  </Text>
                </Center>
              </Box>
            </GridItem>
          );
        })}
      </Grid>
    </Box>
  );
};
