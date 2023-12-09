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
                onContextMenu={(e) => e.preventDefault()}
                w="100%"
                h={`${calculateStepsHeight()}px`}
                bg={sequence[node] ? "darkorange" : "#E8E3DD"}
                transition="all 0.3s ease"
                opacity={sequence[node] ? 1 : 1}
                borderRadius={`0 ${calculateStepsHeight() / 4}px 0 ${
                  calculateStepsHeight() / 4
                }px`}
                cursor="pointer"
                _hover={{
                  background: sequence[node] ? "darkorange" : "darkorangehover",
                  transition: "all 0.3s ease",
                  boxShadow: sequence[node]
                    ? "3px 3px 9px rgba(176, 147, 116, 0.6), -3px -3px 9px rgba(251, 245, 255, 0.3)"
                    : "0 4px 8px rgba(176, 147, 116, 1) inset",
                }}
                boxShadow={
                  sequence[node]
                    ? "3px 3px 9px rgba(176, 147, 116, 0.6), -3px -3px 9px rgba(251, 245, 255, 0.3)"
                    : "0 4px 8px rgba(176, 147, 116, 1) inset"
                }
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
                    sequences[slot][variation][1][node] * 100,
                    12
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
