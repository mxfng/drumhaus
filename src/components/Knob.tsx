"use client";

import { Box, Center } from "@chakra-ui/react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

type KnobProps = {
  size: number;
};

export const Knob: React.FC<KnobProps> = ({ size }) => {
  // Track mouse down state
  const [isMouseDown, setIsMouseDown] = useState(false);

  // Track mouse in (x,y) space
  const [mouseDown, setMouseDown] = useState({ x: 0, y: 0 });
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  // Track current mouse (x,y) relative to mouse down value
  const [previousInterpolatedMouseY, setPreviousInterpolatedMouseY] =
    useState(0);

  // For when user holds shift
  const [previousFineInterpolatedMouseY, setPreviousFineInterpolatedMouseY] =
    useState(0);

  // Track hitbox size for knob
  const [hitboxSize, setHitboxSize] = useState(`${size}px`);

  // Create a motion value to transform against for rotation animation
  const mouseYMotion = useMotionValue(0);

  // Create a ref to track the knob div
  const knobRef = useRef<HTMLDivElement>(null);

  // Dev parameters
  const [sensitivity, setSensitivity] = useState(150);

  const [sensitivityAdjuster, setSensitivityAdjuster] = useState(1);

  const interpolatedMouseY = Math.max(
    0,
    Math.min(mouseDown.y - mouse.y + previousInterpolatedMouseY, sensitivity)
  );

  // Handler for mouse down events
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseDown(true);
    setMouseDown({ x: event.clientX, y: event.clientY });
    setMouse({ x: event.clientX, y: event.clientY });

    // Debugging
    // console.log("mouse down");
  };

  // Handler for mouse up events
  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    setIsMouseDown(false);
    setMouseDown({ x: event.clientX, y: event.clientY });
    setMouse({ x: event.clientX, y: event.clientY });
    setHitboxSize(`${size}px`);

    // Save interpolated transform value state
    setPreviousInterpolatedMouseY(interpolatedMouseY);

    // Debugging
    // console.log("mouse up");
  };

  // Handler for mouse move events
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isMouseDown) {
      // Grab current mouse values
      setMouse({ x: event.clientX, y: event.clientY });

      // Calculate interpolated mouse y for transform
      mouseYMotion.set(interpolatedMouseY);

      // Calculate the new hitbox size based on the distance
      const newHitboxSize = "10000px"; // Adjust the maximum size if needed

      setHitboxSize(newHitboxSize);

      // Debugging
      // console.log(`mouse: ${mouse.x}, ${mouse.y}`);
      // console.log(`interp Y: ${interpolatedMouseY}`);
      // console.log(`hitbox: ${newHitboxSize}`);
      // console.log("mouse moving while down");
    }
  };

  // Check when mouse leaves client window
  const handleMouseLeave = (event: React.MouseEvent<HTMLDivElement>) => {
    //handleMouseUp();
    setIsMouseDown(false);
    setMouse({ x: event.clientX, y: event.clientY });
    setHitboxSize(`${size}px`);

    // Save interpolated transform value state
    setPreviousInterpolatedMouseY(interpolatedMouseY);

    // Debugging
    // console.log("mouse up");
  };

  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Reduce the sensitivity when shift key is pressed
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        console.log("shift pressed");
        setPreviousInterpolatedMouseY(interpolatedMouseY); // issue here
        setIsShiftPressed(true);
        setSensitivity(250);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        console.log("shift released");
        setPreviousInterpolatedMouseY(interpolatedMouseY); // issue here
        setIsShiftPressed(true);
        setSensitivity(150);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      // Clean up the event listeners when the component unmounts
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Apply interpolated mouse Y value to framer motion transform function
  const rotation = useTransform(mouseYMotion, [0, sensitivity], [-180, 0]);

  // Cleanup on unmount or whenever mouse is up
  useEffect(() => {
    return () => {
      setIsMouseDown(false);
    };
  }, []);

  return (
    <>
      <Box
        ref={knobRef}
        key="knob-mask"
        w={`${size}px`}
        h={`${size}px`}
        position="relative"
      >
        <Center w="100%" h="100%">
          <motion.div
            className="knob-hitbox"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMoveCapture={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotate: rotation,
              width: hitboxSize,
              height: hitboxSize,
              originX: 0.5,
              originY: 0.5,
              position: "absolute",
              zIndex: 2,
              border: "1px solid red", // debug
              backgroundColor: "#002345",
              opacity: 0.2,
            }}
          >
            <Center h="100%" w="100%">
              <Center
                className="knob-tick"
                h={`${size}px`}
                w={`${size}px`}
                position="absolute"
                pointerEvents="none"
                outline="1px solid green" // debug
              >
                <Box
                  w={`${size / 4}px`}
                  h={`${Math.floor(size / 12)}px`}
                  bg="orangered"
                  position="absolute"
                  right={0}
                />
              </Center>
            </Center>
          </motion.div>
          <Box
            className="knob-body"
            w={`${size}px`}
            h={`${size}px`}
            bg="gray"
            position="absolute"
            left={0}
            borderRadius="full"
          />
        </Center>
      </Box>
    </>
  );
};
