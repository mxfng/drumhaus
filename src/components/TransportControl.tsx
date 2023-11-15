"use client";

import { Box, Button, Center, Flex, Input, Text } from "@chakra-ui/react";
import { Knob } from "./Knob";
import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";

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

  const handleBlur = () => {
    // Handle the form submission logic with inputValue when the input loses focus
    setBpm(bpmInputValue);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle the form submission logic with inputValue when the Enter key is pressed
    if (event.key === "Enter") {
      setBpm(bpmInputValue);
    }
  };

  const handleBpmUp = () => {
    setBpmInputValue((prevBpmInputValue) => {
      const newBpmInputValue = prevBpmInputValue + 1;
      const validBpmInputValue = Math.min(newBpmInputValue, 300);

      setBpm(validBpmInputValue);

      return validBpmInputValue;
    });
  };

  const handleBpmDown = () => {
    setBpmInputValue((prevBpmInputValue) => {
      const newBpmInputValue = prevBpmInputValue - 1;
      const validBpmInputValue = Math.max(newBpmInputValue, 1);

      setBpm(validBpmInputValue);

      return validBpmInputValue;
    });
  };

  // Handle mouse hold on BPM buttons
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const upBHandleMouseDown = () => {
      intervalId = setInterval(() => {
        handleBpmUp();
      }, 100);
    };

    const downBHandleMouseDown = () => {
      intervalId = setInterval(() => {
        handleBpmDown();
      }, 100);
    };

    const handleMouseUp = () => {
      clearInterval(intervalId);
    };

    if (upButtonRef.current) {
      upButtonRef.current.addEventListener("mousedown", upBHandleMouseDown);
    }

    if (downButtonRef.current) {
      downButtonRef.current.addEventListener("mousedown", downBHandleMouseDown);
    }

    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (upButtonRef.current) {
        upButtonRef.current.removeEventListener(
          "mousedown",
          upBHandleMouseDown
        );
      }

      if (downButtonRef.current) {
        downButtonRef.current.removeEventListener(
          "mousedown",
          downBHandleMouseDown
        );
      }

      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

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
                    onKeyDown={handleKeyDown}
                    border="0px solid transparent"
                    focusBorderColor="transparent" // Set the focus border color to transparent
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
                    onClick={handleBpmUp}
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
                    onClick={handleBpmDown}
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
