"use client";

import { Box, Button, Center, Flex, Input, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";
import { CustomSlider } from "../common/CustomSlider";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
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
  const handleBlur = () => {
    setBpm(bpmInputValue);
  };

  // Handle mouse hold on BPM buttons
  useEffect(() => {
    const updateBpm = (modifier: number) => {
      setBpmInputValue((prevBpmInputValue) => {
        const newBpmInputValue = Math.min(
          Math.max(prevBpmInputValue + modifier, MIN_BPM),
          MAX_BPM
        );
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

  useEffect(() => {
    setBpm(bpmInputValue);
  }, [bpmInputValue, setBpm]);

  useEffect(() => {
    setBpmInputValue(bpm);
  }, [bpm]);

  return (
    <>
      <Center h="100%" w="150px" position="relative">
        <Box>
          <Flex>
            <Center>
              <Box
                w="150px"
                h="70px"
                borderRadius="8px"
                p={3}
                top={10}
                position="absolute"
                className="neumorphicExtraTall"
              >
                <Center h="100%" position="relative" zIndex={3}>
                  <Flex h="100%">
                    <Input
                      ref={inputRef}
                      fontFamily={`'Pixelify Sans Variable', sans-serif`}
                      fontSize={40}
                      color="gray"
                      w="98px"
                      h="100%"
                      boxShadow="0 4px 8px rgba(176, 147, 116, 0.6) inset"
                      position="absolute"
                      left={0}
                      borderRadius="8px 0 0 8px"
                      type="number"
                      value={bpmInputValue}
                      onChange={handleBpmChange}
                      onBlur={handleBlur}
                      border="0px solid transparent"
                      focusBorderColor="transparent"
                      _focus={{
                        boxShadow: "0 4px 8px rgba(176, 147, 116, 0.6) inset",
                      }}
                      onFocus={(e) => e.target.select()}
                      _selection={{ background: "rgba(255, 140, 0, 0.5)" }}
                      textAlign="center"
                      lineHeight="100%"
                    />
                    <Button
                      w="10px"
                      h="35px"
                      borderRadius="0 8px 0 0"
                      position="absolute"
                      top={-3}
                      right={-3}
                      ref={upButtonRef}
                    >
                      <IoTriangleSharp color="#B09374" />
                    </Button>
                    <Button
                      w="20px"
                      h="35px"
                      borderRadius="0 0 8px 0"
                      position="absolute"
                      right={-3}
                      bottom={-3}
                      ref={downButtonRef}
                    >
                      <IoTriangleSharp
                        color="#B09374"
                        style={{ transform: "rotate(180deg)" }}
                      />
                    </Button>
                  </Flex>
                  <Center position="absolute" left={-1} bottom={-6}>
                    <Text fontSize={12} color="gray" my={-3}>
                      TEMPO
                    </Text>
                  </Center>
                </Center>
              </Box>
            </Center>

            {/* <Knob
            size={60}
            knobValue={swing}
            setKnobValue={setSwing}
            knobTitle="SWING"
            defaultValue={0}
          /> */}
          </Flex>
          <Box position="absolute" bottom={6} left={0}>
            <CustomSlider
              size={146}
              sliderValue={swing}
              setSliderValue={setSwing}
              title="SWING"
              defaultValue={0}
            />
          </Box>
        </Box>
      </Center>
    </>
  );
};
