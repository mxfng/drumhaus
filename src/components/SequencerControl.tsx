"use client";

import { Sequences } from "@/types/types";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

type SequencerControlProps = {
  variation: number;
  setVariation: React.Dispatch<React.SetStateAction<number>>;
  chain: number;
  setChain: React.Dispatch<React.SetStateAction<number>>;
  currentSequence: boolean[];
  setCurrentSequence: React.Dispatch<React.SetStateAction<boolean[]>>;
  slot: number;
  sequences: Sequences;
  setSequences: React.Dispatch<React.SetStateAction<Sequences>>;
};

export const SequencerControl: React.FC<SequencerControlProps> = ({
  variation,
  setVariation,
  chain,
  setChain,
  currentSequence,
  setCurrentSequence,
  slot,
  sequences,
  setSequences,
}) => {
  const [copiedSequence, setCopiedSequence] = useState<boolean[] | undefined>();

  const copySequence = () => {
    setCopiedSequence(currentSequence);
  };

  const pasteSequence = () => {
    if (copiedSequence) {
      setCurrentSequence(copiedSequence);
      setSequences((prevSequences) => {
        const newSequences = [...prevSequences];
        newSequences[slot][variation][0] = copiedSequence;
        return newSequences;
      });
    }
  };

  const clearSequence = () => {
    const clearedSequence = Array(16).fill(false);
    setCurrentSequence(clearedSequence);
    setSequences((prevSequences) => {
      const newSequences = [...prevSequences];
      newSequences[slot][variation][0] = clearedSequence;
      return newSequences;
    });
  };

  const randomSequence = () => {
    const randomSequence: boolean[] = Array.from(
      { length: 16 },
      () => Math.random() < 0.5
    );
    setCurrentSequence(randomSequence);
    setSequences((prevSequences) => {
      const newSequences = [...prevSequences];
      newSequences[slot][variation][0] = randomSequence;
      return newSequences;
    });
  };

  return (
    <>
      <Center h="100%" w="280px" px={4}>
        <Box>
          <Text fontSize={12} color="gray" pb={4}>
            SEQUENCER
          </Text>
          <Grid templateColumns="repeat(3,1fr)" pb={8}>
            <GridItem colSpan={1} position="relative" pr={2}>
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={1}
              >
                SHOW
              </Text>
              <Center>
                <Flex
                  boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
                  borderRadius="8px"
                >
                  <Button
                    h="30px"
                    w="30px"
                    bg="transparent"
                    borderRadius="8px 0 0 8px"
                    color={variation == 0 ? "darkorange" : "gray"}
                    onClick={() => setVariation(0)}
                  >
                    A
                  </Button>
                  <Button
                    h="30px"
                    w="30px"
                    bg="transparent"
                    borderRadius="0 8px 8px 0"
                    color={variation == 1 ? "darkorange" : "gray"}
                    onClick={() => setVariation(1)}
                  >
                    B
                  </Button>
                </Flex>
              </Center>
            </GridItem>
            <GridItem colSpan={1} position="relative">
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={1}
              >
                CHAIN
              </Text>
              <Center>
                <Flex
                  boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
                  borderRadius="8px"
                >
                  <Button
                    h="30px"
                    w="40px"
                    bg="transparent"
                    borderRadius="8px 0 0 8px"
                    color={chain == 0 ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setChain(0)}
                  >
                    A
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    bg="transparent"
                    borderRadius="0 0 0 0"
                    color={chain == 1 ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setChain(1)}
                  >
                    B
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    bg="transparent"
                    borderRadius="0 0 0 0"
                    color={chain == 2 ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setChain(2)}
                  >
                    AB
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    bg="transparent"
                    borderRadius="0 8px 8px 0"
                    color={chain == 3 ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setChain(3)}
                  >
                    AAAB
                  </Button>
                </Flex>
              </Center>
            </GridItem>
          </Grid>
          <Grid templateColumns="repeat(4, 1fr)" gap={2} pb={4}>
            <GridItem position="relative">
              <Button
                w="100%"
                h="26px"
                bg="transparent"
                boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
                onClick={copySequence}
              />
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={1}
              >
                COPY
              </Text>
            </GridItem>
            <GridItem position="relative">
              <Button
                w="100%"
                h="26px"
                bg="transparent"
                boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
                onClick={pasteSequence}
              />
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={1}
              >
                PASTE
              </Text>
            </GridItem>
            <GridItem position="relative">
              <Button
                w="100%"
                h="26px"
                bg="transparent"
                boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
                onClick={clearSequence}
              />
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={1}
              >
                CLEAR
              </Text>
            </GridItem>
            <GridItem position="relative">
              <Button
                w="100%"
                h="26px"
                bg="transparent"
                boxShadow="0 2px 4px rgba(0, 0, 0, 0.2)"
                onClick={randomSequence}
              />
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={1}
              >
                RAND
              </Text>
            </GridItem>
          </Grid>
        </Box>
      </Center>
    </>
  );
};
