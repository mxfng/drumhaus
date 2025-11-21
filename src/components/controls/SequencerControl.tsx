import { useState } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Text,
} from "@chakra-ui/react";
import { BsFillEraserFill } from "react-icons/bs";
import { FaDice } from "react-icons/fa";
import { IoBrushSharp, IoCopySharp } from "react-icons/io5";

import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { usePatternStore } from "@/stores/usePatternStore";

export const SequencerControl: React.FC = () => {
  // Get state from Sequencer Store
  const variation = usePatternStore((state) => state.variation);
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const pattern = usePatternStore((state) => state.pattern);
  const currentTriggers = usePatternStore(
    (state) =>
      state.pattern[state.voiceIndex].variations[state.variation].triggers,
  );

  // Get actions from store
  const setVariation = usePatternStore((state) => state.setVariation);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);
  const updateSequence = usePatternStore((state) => state.updatePattern);
  const clearSequence = usePatternStore((state) => state.clearPattern);
  const [copiedTriggers, setCopiedTriggers] = useState<boolean[] | undefined>();
  const [copiedVelocities, setCopiedVelocities] = useState<
    number[] | undefined
  >();

  const copySequence = () => {
    setCopiedTriggers(currentTriggers);
    setCopiedVelocities(pattern[voiceIndex].variations[variation].velocities);
  };

  const pasteSequence = () => {
    if (copiedTriggers && copiedVelocities) {
      updateSequence(voiceIndex, variation, copiedTriggers, copiedVelocities);
    }
  };

  const handleClearSequence = () => {
    clearSequence(voiceIndex, variation);
  };

  const handleRandomSequence = () => {
    const randomTriggers: boolean[] = Array.from(
      { length: STEP_COUNT },
      () => Math.random() < 0.5,
    );
    const randomVelocities: number[] = Array.from({ length: STEP_COUNT }, () =>
      Math.random(),
    );
    updateSequence(voiceIndex, variation, randomTriggers, randomVelocities);
  };

  return (
    <>
      <Center h="100%" w="280px" px={4}>
        <Box>
          <Text fontSize={12} color="gray" pb={4} opacity={0.5}>
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
                <Flex className="neumorphic" borderRadius="8px">
                  <Button
                    h="30px"
                    w="30px"
                    className="raised"
                    borderRadius="8px 0 0 8px"
                    color={variation == 0 ? "darkorange" : "#B09374"}
                    onClick={() => setVariation(0)}
                  >
                    A
                  </Button>
                  <Button
                    h="30px"
                    w="30px"
                    className="raised"
                    borderRadius="0 8px 8px 0"
                    color={variation == 1 ? "darkorange" : "#B09374"}
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
                VAR CYC
              </Text>
              <Center>
                <Flex className="neumorphic" borderRadius="8px">
                  <Button
                    h="30px"
                    w="40px"
                    className="raised"
                    borderRadius="8px 0 0 8px"
                    color={variationCycle === "A" ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setVariationCycle("A")}
                  >
                    A
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    className="raised"
                    borderRadius="0 0 0 0"
                    color={variationCycle === "B" ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setVariationCycle("B")}
                  >
                    B
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    className="raised"
                    borderRadius="0 0 0 0"
                    color={variationCycle === "AB" ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setVariationCycle("AB")}
                  >
                    AB
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    className="raised"
                    borderRadius="0 8px 8px 0"
                    color={variationCycle === "AAAB" ? "darkorange" : "gray"}
                    fontSize={12}
                    onClick={() => setVariationCycle("AAAB")}
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
                className="neumorphicRaised"
                onClick={copySequence}
              >
                <IoCopySharp color="#B09374" />
              </Button>
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
                className="neumorphicRaised"
                onClick={pasteSequence}
              >
                <IoBrushSharp color="#B09374" />
              </Button>
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
                className="neumorphicRaised"
                onClick={handleClearSequence}
              >
                <BsFillEraserFill color="#B09374" />
              </Button>
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
                className="neumorphicRaised"
                onClick={handleRandomSequence}
              >
                <FaDice color="#B09374" />
              </Button>
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
