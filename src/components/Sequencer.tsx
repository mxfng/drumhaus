"use client";

import { Sequences } from "@/types/types";
import { Box, Center, Grid, GridItem, Text } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";

const STEP_BOXES_GAP = 12;
const NUM_OF_STEPS = 16;

type SequencerProps = {
  sequence: boolean[];
  setSequence: React.Dispatch<React.SetStateAction<boolean[]>>;
  sequences: Sequences;
  setSequences: React.Dispatch<React.SetStateAction<Sequences>>;
  variation: number;
  slot: number;
  step: number;
  isPlaying: boolean;
};

export const Sequencer: React.FC<SequencerProps> = ({
  sequence,
  setSequence,
  sequences,
  setSequences,
  variation,
  slot,
  step,
  isPlaying,
}) => {
  const [parentWidth, setParentWidth] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [isWriting, setWriteState] = useState<boolean>(true);
  const [isVelocity, setIsVelocity] = useState<boolean>(false);
  const sequencerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const resizeStepBoxes = () => {
      if (sequencerRef.current) {
        setParentWidth(sequencerRef.current.offsetWidth);
      }
    };

    window.addEventListener("resize", resizeStepBoxes);
    resizeStepBoxes(); // Initial sizing

    return () => {
      window.removeEventListener("resize", resizeStepBoxes);
    };
  }, []);

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
    return parentWidth / NUM_OF_STEPS - STEP_BOXES_GAP;
  };

  const toggleStep = (index: number) => {
    setSequence((prevSequence: boolean[]) => {
      const newSequence = [...prevSequence];
      newSequence[index] = !newSequence[index];

      setSequences((prevSequences: Sequences) => {
        const newSequences = [...prevSequences];
        newSequences[slot][variation][0] = newSequence;
        newSequences[slot][variation][1][index] = 1;
        return newSequences;
      });

      return newSequence;
    });
  };

  const toggleStepOnMouseDown = (node: number, nodeState: boolean) => {
    setIsMouseDown(true);
    setWriteState(!nodeState);
    toggleStep(node);
  };

  const toggleStepOnMouseOver = (node: number, nodeState: boolean) => {
    if (isMouseDown && nodeState !== isWriting && !isVelocity) {
      toggleStep(node);
    }
  };

  const getVelocityValue = (
    event: React.MouseEvent<HTMLDivElement>,
    node: number
  ) => {
    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const divWidth = rect.width;
    const calculateVelocity = Math.max(Math.min(mouseX / divWidth, 100), 0);
    setSequences((prevSequences) => {
      const newSequences = [...prevSequences];
      newSequences[slot][variation][1][node] = calculateVelocity;
      return newSequences;
    });
  };

  const adjustVelocityOnMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    node: number
  ) => {
    setIsMouseDown(true);
    setIsVelocity(true);
    getVelocityValue(event, node);
  };

  const adjustVelocityOnMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
    node: number
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
        templateColumns={`repeat(${NUM_OF_STEPS}, 1fr)`}
        w="100%"
        h="100%"
        gap={`${STEP_BOXES_GAP}px`}
      >
        {Array.from({ length: NUM_OF_STEPS }, (_, index) => index).map(
          (node) => (
            <GridItem key={`sequenceNodeGridItem${node}`} colSpan={1}>
              <Box
                key={`sequenceNodeStepIndicator${node}`}
                mb={4}
                h="4px"
                w="100%"
                opacity={
                  node == step && isPlaying
                    ? 1
                    : [0, 4, 8, 12].includes(node)
                    ? 0.6
                    : 0.2
                }
                bg={node == step && isPlaying ? "darkorange" : "gray"}
              />
              <Box
                key={`sequenceNode${node}`}
                onMouseDown={() => toggleStepOnMouseDown(node, sequence[node])}
                onMouseEnter={() => toggleStepOnMouseOver(node, sequence[node])}
                w="100%"
                h={`${calculateStepsHeight()}px`}
                bg={sequence[node] ? "darkorange" : "transparent"}
                transition="all 0.2s ease"
                opacity={sequence[node] ? 1 : 0.5}
                outline="4px solid darkorange"
                borderRadius={`${calculateStepsHeight() / 4}px 0 ${
                  calculateStepsHeight() / 4
                }px 0`}
                _hover={{
                  background: "darkorange",
                }}
                transform="0.2s ease"
              />
              <Box
                key={`sequenceNodeVelocity${node}`}
                w="100%"
                h="14px"
                mt={3}
                bg={sequence[node] ? "transparent" : "transparent"}
                transition="all 0.2s ease"
                opacity={sequence[node] ? 0.6 : 0}
                outline="1px solid darkorange"
                transform="opacity 0.2s ease"
                position="relative"
                onMouseDown={(ev) => adjustVelocityOnMouseDown(ev, node)}
                onMouseMove={(ev) => adjustVelocityOnMouseMove(ev, node)}
                _hover={{
                  "& p": {
                    opacity: 1,
                  },
                }}
              >
                <Box
                  bg="darkorange"
                  h="100%"
                  w={`${sequences[slot][variation][1][node] * 100}%`}
                  position="absolute"
                />
                <Center position="absolute" h="100%" w="100%">
                  <Text
                    color="white"
                    fontFamily={`'Pixelify Sans Variable', sans-serif`}
                    opacity={0}
                    transition="0.5s ease"
                  >
                    {(sequences[slot][variation][1][node] * 100).toFixed(0)}
                  </Text>
                </Center>
              </Box>
            </GridItem>
          )
        )}
      </Grid>
    </Box>
  );
};
