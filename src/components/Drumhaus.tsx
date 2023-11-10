"use client";

import Clock from "@/lib/clock";
import DrumMachine from "@/lib/drumMachine";
import { Box, Button, Center, Heading } from "@chakra-ui/react";

const Drumhaus = () => {
  const createDrumMachine = () => {
    const audioContext = new window.AudioContext();

    const clock = new Clock({
      numberOfBeats: 16,
      tempo: 120 * 4,
      audioContext: audioContext,
    });

    return new DrumMachine({
      clock,
      basePath: "https://s3-us-west-2.amazonaws.com/demo-aud-samp/samples/",
      instruments: {
        kick: "BD_Blofeld_001.wav",
        snare: "SD_Blofeld_06.wav",
        hat: "HH_Blofeld_001.wav",
        openHat: "Clap_Blofeld_2.wav",
      },
      pattern: defaultPattern,
      audioContext,
    });
  };

  return (
    <>
      <Center h="100vh">
        <Box w="fit-content">
          <Heading>Drumhaus</Heading>
          <Button
            onClick={() => {
              const drumMachine = createDrumMachine();
              drumMachine.startPlayback();
            }}
          >
            Play
          </Button>
        </Box>
      </Center>
    </>
  );
};

const defaultPattern = {
  kick: {
    hits: [
      "x",
      " ",
      " ",
      " ",
      "x",
      " ",
      " ",
      " ",
      "x",
      " ",
      " ",
      " ",
      "x",
      " ",
      " ",
      " ",
    ],
    velocities: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  snare: {
    hits: [
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
    ],
    velocities: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  hat: {
    hits: [
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
      "x",
    ],
    velocities: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  openHat: {
    hits: [
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
      " ",
    ],
    velocities: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
};

export default Drumhaus;
