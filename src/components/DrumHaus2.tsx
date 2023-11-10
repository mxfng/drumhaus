import { Button, Text } from "@chakra-ui/react";
import { useState } from "react";

export const DrumHaus2 = () => {
  const [steps, setSteps] = useState([0, 0, 0, 0]);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const handlePlayPress = () => {};

  return (
    <>
      <Text>{`Current Step: ${currentStep % steps.length}`}</Text>
      <Button className="play-button" onClick={() => handlePlayPress()}>
        {playing ? "Stop" : "Play"}
      </Button>
    </>
  );
};
