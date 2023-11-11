"use client";

import { useSampler } from "@/hooks/useSampler";
import { useSamples } from "@/hooks/useSamples";
import { useTransport } from "@/hooks/useTransport";
import { Box, Button, Center, Heading } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import * as Tone from "tone/build/esm/index";

const Drumhaus = () => {
  // Initialize Samples
  const { samples, setSamples } = useSamples();

  // Initialize preset params
  const [bpm, setBpm] = useState(120);
  const [swing, setSwing] = useState(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const { sampler } = useSampler(samples);

  // -------- Parameters -------

  // Set BPM
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  // Set Swing
  useEffect(() => {
    Tone.Transport.swing = swing;
  }, [swing]);

  // Set Transport to Play Button
  useTransport(sampler);

  return (
    <>
      <Center h="100vh">
        <Box>
          <Heading id="logo" variant="logo">
            drumhaus
          </Heading>
          <Button id="playButton">Start</Button>
        </Box>
      </Center>
    </>
  );
};

export default Drumhaus;
