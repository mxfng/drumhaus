"use client";

import { Box, Button, Center, Flex, Input, Text } from "@chakra-ui/react";
import { Knob } from "./Knob";
import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";

// Constants
const MIN_BPM = 1;
const MAX_BPM = 300;
const HOLD_INTERVAL = 130;

type TransportControlProps = {
  bpm: number;
  setBpm: React.Dispatch<React.SetStateAction<number>>;
  swing: number;
  setSwing: React.Dispatch<React.SetStateAction<number>>;
};

export const TransportControl: React.FC<TransportControlProps> = ({
  bpm,
  setBpm,
  swing,
  setSwing,
}) => {
  const [bpmInputValue, setBpmInputValue] = useState<number>(bpm);
  const upButtonRef = useRef<HTMLButtonElement | null>(null);
  const downButtonRef = useRef<HTMLButtonElement | null>(null);

  const handleBpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (/^\d+$/.test(value)) {
      const numericValue = parseInt(value, 10);
      if (numericValue >= 0 && numericValue <= 300) {
        setBpmInputValue(numericValue);
      }
    }
  };

  // Handle the form submission logic with inputValue when the input loses focus
  const handleBlur = () => setBpm(bpmInputValue);

  // Handle the form submission logic with inputValue when the Enter key is pressed
  // This does not work
  // const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
  //   if (event.key === "Enter") setBpm(bpmInputValue);
  // };

  // Handle mouse hold on BPM buttons
  useEffect(() => {
    const updateBpm = (modifier: number) => {
      setBpmInputValue((prevBpmInputValue) => {
        const newBpmInputValue = Math.min(
          Math.max(prevBpmInputValue + modifier, MIN_BPM),
          MAX_BPM
        );
        setBpm(newBpmInputValue);
        return newBpmInputValue;
      });
    };

    let intervalId: NodeJS.Timeout;
    const upButton = upButtonRef.current;
    const downButton = downButtonRef.current;

    const handleUpButtonMouseDown = () => {
      updateBpm(1);
      intervalId = setInterval(() => updateBpm(1), HOLD_INTERVAL);
    };

    const handleDownButtonMouseDown = () => {
      updateBpm(-1);
      intervalId = setInterval(() => updateBpm(-1), HOLD_INTERVAL);
    };

    const handleMouseUp = () => {
      clearInterval(intervalId);
    };

    if (upButton)
      upButton.addEventListener("mousedown", handleUpButtonMouseDown);
    if (downButton)
      downButton.addEventListener("mousedown", handleDownButtonMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (upButton)
        upButton.removeEventListener("mousedown", handleUpButtonMouseDown);
      if (downButton)
        downButton.removeEventListener("mousedown", handleDownButtonMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setBpm]);

  return (
    <>
      <Center h="100%" px={6}>
        <Flex>
          <Center>
            <Box
              w="200px"
              h="70px"
              borderRadius="8px"
              p={3}
              boxShadow="0 4px 8px rgba(0, 0, 0, 0.2)"
            >
              <Center h="100%" position="relative" zIndex={3}>
                <Flex h="100%">
                  <Input
                    fontFamily={`'Pixelify Sans Variable', sans-serif`}
                    fontSize={40}
                    color="gray"
                    w="148px"
                    h="100%"
                    boxShadow="0 4px 8px rgba(0, 0, 0, 0.2) inset"
                    position="absolute"
                    left={0}
                    borderRadius="8px 0 0 8px"
                    type="number"
                    placeholder={bpm.toString()}
                    value={bpmInputValue}
                    onChange={handleBpmChange}
                    onBlur={handleBlur}
                    // onKeyDown={handleKeyDown}
                    border="0px solid transparent"
                    focusBorderColor="transparent"
                    _focus={{
                      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2) inset",
                    }}
                    onFocus={(e) => e.target.select()}
                    _selection={{ background: "rgba(255, 140, 0, 0.5)" }}
                    textAlign="center"
                  />
                  <Button
                    w="10px"
                    h="35px"
                    borderRadius="0 8px 0 0"
                    bg="silver"
                    position="absolute"
                    top={-3}
                    right={-3}
                    ref={upButtonRef}
                  >
                    <IoTriangleSharp color="gray" />
                  </Button>
                  <Button
                    w="20px"
                    h="35px"
                    borderRadius="0 0 8px 0"
                    bg="silver"
                    position="absolute"
                    right={-3}
                    bottom={-3}
                    ref={downButtonRef}
                  >
                    <IoTriangleSharp
                      color="gray"
                      style={{ transform: "rotate(180deg)" }}
                    />
                  </Button>
                </Flex>
                <Center position="absolute" left={-1} bottom={-6}>
                  <Text fontSize={12} color="gray" my={-3}>
                    BPM
                  </Text>
                </Center>
              </Center>
            </Box>
          </Center>

          <Knob
            size={60}
            knobValue={swing}
            setKnobValue={setSwing}
            knobTitle="SWING"
          />
        </Flex>
      </Center>
    </>
  );
};
