"use client";

import { Button, Text } from "@chakra-ui/react";
import { useState } from "react";

export const Drumhaus = () => {
  const [steps, setSteps] = useState([0, 0, 0, 0]);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const handlePlayPress = () => {
    if (!playing) {
      setCurrentStep(-1);
      setPlaying(true);

      // start clock
      // clock.start()
      // tickEvent = this.clock.callbackAtTime(
      //  handleTick.bind(this),
      //  this.context.currentTime
      // ).repeat(0.47);
    } else {
      setPlaying(false);
      // stop the clock
      // clock.stop()
      // tickEvent.clear()
      // tickEvent = null
    }
  };

  return (
    <>
      <Text>{`Current Step: ${currentStep % steps.length}`}</Text>
      <Button className="play-button" onClick={() => handlePlayPress()}>
        {playing ? "Stop" : "Play"}
      </Button>
    </>
  );
};
