import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Text,
} from "@chakra-ui/react";

type SequencerControlProps = {
  variation: number;
  setVariation: React.Dispatch<React.SetStateAction<number>>;
};

export const SequencerControl: React.FC<SequencerControlProps> = ({
  variation,
  setVariation,
}) => {
  const toggleVariationToA = () => {
    setVariation(0);
  };

  const toggleVariationToB = () => {
    setVariation(1);
  };

  return (
    <>
      <Center h="100%" w="100%" p={4}>
        <Box>
          <Text fontSize={12} color="gray" mx={3} pb={4}>
            SEQUENCER
          </Text>
          <Grid templateColumns="repeat(3,1fr)">
            <GridItem colSpan={1} position="relative">
              <Text
                fontSize={12}
                color="gray"
                my={-3}
                position="absolute"
                bottom={-3}
                left={3}
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
                    onClick={toggleVariationToA}
                  >
                    A
                  </Button>
                  <Button
                    h="30px"
                    w="30px"
                    bg="transparent"
                    borderRadius="0 8px 8px 0"
                    color={variation == 1 ? "darkorange" : "gray"}
                    onClick={toggleVariationToB}
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
                left={0}
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
                    color="gray"
                    fontSize={12}
                  >
                    A
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    bg="transparent"
                    borderRadius="0 0 0 0"
                    color="gray"
                    fontSize={12}
                  >
                    AB
                  </Button>
                  <Button
                    h="30px"
                    w="40px"
                    bg="transparent"
                    borderRadius="0 8px 8px 0"
                    color="gray"
                    fontSize={12}
                  >
                    AAAB
                  </Button>
                </Flex>
              </Center>
            </GridItem>
          </Grid>
        </Box>
      </Center>
    </>
  );
};
