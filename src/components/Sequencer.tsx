"use client";

import { Box, Grid, GridItem } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";

export const Sequencer: React.FC<any> = ({ sequence, setSequence, step }) => {
  const [parentWidth, setParentWidth] = useState<number>(0);
  const [isMouseDown, setIsMouseDown] = useState<boolean>(false);
  const [writeState, setWriteState] = useState<boolean>(true);

  const sequencerRef = useRef<HTMLDivElement | null>(null);

  const gap = 8;

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
          <GridItem
            key={`sequenceNode${node}`}
            onMouseDown={() => handleMouseDown(node, sequence[node])}
            onMouseEnter={() => handleMouseEnter(node, sequence[node])}
            colSpan={1}
            w="100%"
            h={`${calculateHeight()}px`}
            bg="darkorange"
            opacity={sequence[node] ? 1 : 0.5}
            outline={
              step == node ? "4px solid darkorange" : "1px solid darkorange"
            }
            borderRadius={`${calculateHeight() / 4}px 0 ${
              calculateHeight() / 4
            }px 0`}
          ></GridItem>
        ))}
      </Grid>
    </Box>
  );
};
