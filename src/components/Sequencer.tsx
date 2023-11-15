"use client";

import { Box, Grid, GridItem } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";

export const Sequencer: React.FC<any> = ({
  sequence,
  setSequence,
  setSequences,
  slot,
  step,
  isPlaying,
}) => {
  const [parentWidth, setParentWidth] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [writeState, setWriteState] = useState<boolean>(true);

  const sequencerRef = useRef<HTMLDivElement | null>(null);

  const gap = 12;

  // Resize sequence boxes to parent width
  useEffect(() => {
    const handleResize = () => {
      if (sequencerRef.current) {
        setParentWidth(sequencerRef.current.offsetWidth);
      }
    };

    window.addEventListener("resize", handleResize);
    handleResize(); // Initial sizing

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const calculateHeight = () => {
    return parentWidth / 16 - gap;
  };

  const toggleStep = (index: number) => {
    setSequence((prevSequence: boolean[]) => {
      const newSequence = [...prevSequence];
      newSequence[index] = !newSequence[index];

      // Is this a bad pattern? Because it works
      setSequences((prevSequences: boolean[][]) => {
        const newSequences = [...prevSequences];
        newSequences[slot] = newSequence;
        return newSequences;
      });

      return newSequence;
    });
  };

  const handleMouseDown = (node: number, nodeState: boolean) => {
    setIsMouseDown(true);
    setWriteState(!nodeState);
    toggleStep(node);
  };

  const handleMouseEnter = (node: number, nodeState: boolean) => {
    if (isMouseDown && nodeState !== writeState) {
      toggleStep(node);
    }
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);

    // Debugging
    // console.log("mouse up");
  };

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

  return (
    <Box w="100%" ref={sequencerRef}>
      <Grid
        templateColumns="repeat(16, 1fr)"
        w="100%"
        h="100%"
        gap={`${gap}px`}
      >
        {Array.from({ length: 16 }, (_, index) => index).map((node) => (
          <GridItem key={`sequenceNodeGridItem${node}`} colSpan={1}>
            <Box
              key={`sequenceNodeBeatMarker${node}`}
              my={4}
              h="4px"
              w="100%"
              opacity={0.4}
              bg={[0, 4, 8, 12].includes(node) ? "gray" : "transparent"}
            />
            <Box
              key={`sequenceNode${node}`}
              onMouseDown={() => handleMouseDown(node, sequence[node])}
              onMouseEnter={() => handleMouseEnter(node, sequence[node])}
              w="100%"
              h={`${calculateHeight()}px`}
              bg={sequence[node] ? "darkorange" : "transparent"}
              transition="all 0.2s ease"
              opacity={sequence[node] ? 1 : 0.5}
              outline="4px solid darkorange"
              borderRadius={`${calculateHeight() / 4}px 0 ${
                calculateHeight() / 4
              }px 0`}
              _hover={{
                background: "darkorange",
              }}
              transform="0.2s ease"
            />
            <Box
              key={`sequenceNodeStepIndicator${node}`}
              my={4}
              h="4px"
              w="100%"
              opacity={node == step && isPlaying ? 1 : 0.2}
              bg={node == step && isPlaying ? "darkorange" : "gray"}
            />
          </GridItem>
        ))}
      </Grid>
    </Box>
  );
};
