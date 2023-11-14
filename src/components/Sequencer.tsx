"use client";

import { Box, Grid, GridItem } from "@chakra-ui/react";
import React, { useEffect, useRef, useState } from "react";

export const Sequencer: React.FC = () => {
  const [parentWidth, setParentWidth] = useState<number>(0);
  const sequencerRef = useRef<HTMLDivElement | null>(null);

  const gap = 8;

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
            colSpan={1}
            w="100%"
            h={`${calculateHeight()}px`}
            bg="darkorange"
            outline="1px solid darkorange"
            borderRadius={`${calculateHeight() / 4}px 0 ${
              calculateHeight() / 4
            }px 0`}
          ></GridItem>
        ))}
      </Grid>
    </Box>
  );
};
