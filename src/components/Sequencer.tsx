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
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [isWriting, setWriteState] = useState<boolean>(true);
  const [isVelocity, setIsVelocity] = useState<boolean>(false);
  const sequencerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isMouseDown) {
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isMouseDown]);

  useEffect(() => {
    return () => {
      setIsMouseDown(false);
    };
  }, []);

  const calculateStepsHeight = () => {
    return 1538 / NUM_OF_STEPS - STEP_BOXES_GAP;
  };

  const handleToggleStep = (index: number) => {
    toggleStep(voiceIndex, variation, index);
  };

  const toggleStepOnMouseDown = (node: number, nodeState: boolean) => {
    setIsMouseDown(true);
    setWriteState(!nodeState);
    handleToggleStep(node);
  };

  const toggleStepOnMouseOver = (node: number, nodeState: boolean) => {
    if (isMouseDown && nodeState !== isWriting && !isVelocity) {
      handleToggleStep(node);
    }
  };

  const getVelocityValue = (
    event: React.MouseEvent<HTMLDivElement>,
    node: number,
  ) => {
    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const divWidth = rect.width;
    const calculateVelocity = Math.max(Math.min(mouseX / divWidth, 100), 0);
    setVelocity(voiceIndex, variation, node, calculateVelocity);
  };

  const adjustVelocityOnMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    node: number,
  ) => {
    setIsMouseDown(true);
    setIsVelocity(true);
    getVelocityValue(event, node);
  };

  const adjustVelocityOnMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
    node: number,
  ) => {
    if (isMouseDown && isVelocity) {
      getVelocityValue(event, node);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
    setIsVelocity(false);
  };

  return (
    <Box w="100%" ref={sequencerRef}>
      <Grid
        key="sequence-grid"
        templateColumns={`repeat(${NUM_OF_STEPS}, 1fr)`}
        w="100%"
        h="100%"
        gap={`${STEP_BOXES_GAP}px`}
      >
        {Array.from({ length: NUM_OF_STEPS }, (_, index) => index).map(
          (step) => (
            <GridItem key={`sequence-step-item-${step}`} colSpan={1}>
              <Box
                key={`sequence-step-indicator-${step}`}
                mb={4}
                h="4px"
                w="100%"
                opacity={
                  currentStepIndex === step &&
                  isPlaying &&
                  playbackVariation === variation
                    ? 1
                    : [0, 4, 8, 12].includes(step)
                      ? 0.6
                      : 0.2
                }
                bg={
                  currentStepIndex === step &&
                  isPlaying &&
                  playbackVariation === variation
                    ? "darkorange"
                    : "gray"
                }
              />
              <Box
                key={`sequence-step-trigger-${step}`}
                onMouseDown={() => toggleStepOnMouseDown(step, triggers[step])}
                onMouseEnter={() => toggleStepOnMouseOver(step, triggers[step])}
                onContextMenu={(e) => e.preventDefault()}
                w="100%"
                h={`${calculateStepsHeight()}px`}
                bg={triggers[step] ? "darkorange" : "#E8E3DD"}
                transition="all 0.3s ease"
                opacity={
                  playbackVariation !== variation && triggers[step] && isPlaying
                    ? 0.7
                    : 1
                }
                borderRadius={`0 ${calculateStepsHeight() / 4}px 0 ${
                  calculateStepsHeight() / 4
                }px`}
                cursor="pointer"
                _hover={{
                  background: triggers[step] ? "darkorange" : "darkorangehover",
                  transition: "all 0.3s ease",
                  boxShadow: triggers[step]
                    ? "3px 3px 9px rgba(176, 147, 116, 0.6), -3px -3px 9px rgba(251, 245, 255, 0.3)"
                    : "0 4px 8px rgba(176, 147, 116, 1) inset",
                }}
                boxShadow={
                  triggers[step]
                    ? "3px 3px 9px rgba(176, 147, 116, 0.6), -3px -3px 9px rgba(251, 245, 255, 0.3)"
                    : "0 4px 8px rgba(176, 147, 116, 1) inset"
                }
              />
              <Box
                key={`sequence-step-velocity-${step}`}
                w="100%"
                h="14px"
                mt={3}
                bg={triggers[step] ? "transparent" : "transparent"}
                transition="all 0.2s ease"
                opacity={triggers[step] ? 0.6 : 0}
                outline="1px solid darkorange"
                transform="opacity 0.2s ease"
                position="relative"
                onMouseDown={(ev) => adjustVelocityOnMouseDown(ev, step)}
                onMouseMove={(ev) => adjustVelocityOnMouseMove(ev, step)}
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
                  w={`${Math.max(
                    pattern[voiceIndex].variations[variation].velocities[step] *
                      100,
                    12,
                  )}%`}
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
                    {(
                      pattern[voiceIndex].variations[variation].velocities[
                        step
                      ] * 100
                    ).toFixed(0)}
                  </Text>
                </Center>
              </Box>
            </GridItem>
          ),
        )}
      </Grid>
    </Box>
  );
};
