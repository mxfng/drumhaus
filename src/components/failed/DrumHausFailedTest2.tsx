"use client";

import { Button, Text } from "@chakra-ui/react";
import { useState, useEffect } from "react";
import WAAClock from "waaclock";

export const Drumhaus = () => {
  const [steps, setSteps] = useState([1, 0, 0, 0]);
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  let audioContext: AudioContext;
  let clock: WAAClock;
  let tickEvent: WAAClock.Event | null;

  const authorizeAudioContext = () => {
    audioContext = new window.AudioContext();
    clock = new WAAClock(audioContext);
  };

  const handlePlayPress = () => {
    if (!playing) {
      setCurrentStep(0);
      setPlaying(true);

      clock.start();
      tickEvent = clock
        .callbackAtTime((e) => handleTick.bind(e), audioContext.currentTime)
        .repeat(0.47);
    } else {
      setPlaying(false);
      clock.stop();
      tickEvent?.clear();
      tickEvent = null;
    }
  };

  const handleTick = (deadline: number) => {
    const newCurrentStep = currentStep + 1;

    if (steps[newCurrentStep % steps.length]) {
      triggerSound(audioContext, deadline);
    }

    setCurrentStep(newCurrentStep);
  };

  const triggerSound = (audioContext: AudioContext, deadline: number) => {
    const oscillator = audioContext.createOscillator();
    oscillator.frequency.setValueAtTime(200, deadline);
    oscillator.start(deadline);
    oscillator.frequency.linearRampToValueAtTime(50, deadline + 0.15);

    const amplifier = audioContext.createGain();
    oscillator.connect(amplifier);
    amplifier.gain.setValueAtTime(0, deadline);
    amplifier.gain.linearRampToValueAtTime(1.0, deadline + 0.02);
    amplifier.gain.linearRampToValueAtTime(0.0, deadline + 0.2);
    amplifier.connect(audioContext.destination);

    setTimeout(() => {
      amplifier.disconnect();
    }, 3000);
  };

  return (
    <>
      <Text>{`Current Step: ${currentStep % steps.length}`}</Text>
      <Button className="play-button" onClick={() => handlePlayPress()}>
        {playing ? "Stop" : "Play"}
      </Button>
      <Button className="authorize" onClick={() => authorizeAudioContext()}>
        Authorize
      </Button>
    </>
  );
};
