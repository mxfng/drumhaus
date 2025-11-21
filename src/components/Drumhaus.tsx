import { useEffect } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  GridItem,
  Link,
  Text,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { IoPauseSharp, IoPlaySharp } from "react-icons/io5";

import { useAudioEngine } from "@/hooks/useAudioEngine";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useLayoutScale } from "@/hooks/useLayoutScale";
import { useMobileWarning } from "@/hooks/useMobileWarning";
import { usePresetLoading } from "@/hooks/usePresetLoading";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";
import { MasterControl } from "./controls/MasterControl";
import { PresetControl } from "./controls/PresetControl";
import { SequencerControl } from "./controls/SequencerControl";
import { TransportControl } from "./controls/TransportControl";
import FrequencyAnalyzer from "./FrequencyAnalyzer";
import { DrumhausLogo } from "./icon/DrumhausLogo";
import { DrumhausTypographyLogo } from "./icon/DrumhausTypographyLogo";
import { FungPeaceLogo } from "./icon/FungPeaceLogo";
import { InstrumentGrid } from "./instrument/InstrumentGrid";
import { MobileModal } from "./modal/MobileModal";
import { Sequencer } from "./Sequencer";

const FADE_IN_VARIANTS = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const Drumhaus = () => {
  // --- Store State ---

  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  const { scale } = useLayoutScale();

  // --- Service Worker Registration ---

  useServiceWorker();

  // --- Audio Engine and Preset Loading ---

  const { instrumentRuntimes, instrumentRuntimesVersion, isLoading } =
    useAudioEngine();

  const { loadPreset } = usePresetLoading({ instrumentRuntimes });

  // --- Keyboard and Mobile Hooks ---

  useKeyboardShortcuts({
    isLoading,
    instrumentRuntimes,
    instrumentRuntimesVersion,
  });

  const { isMobileWarning, setIsMobileWarning } = useMobileWarning();

  // --- Initial Loader Cleanup ---

  useEffect(() => {
    const loader = document.getElementById("initial-loader");
    if (!loader) return;

    loader.classList.add("initial-loader--hidden");

    const timeout = window.setTimeout(() => {
      loader.remove();
    }, 400);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  // --- Render ---

  return (
    <>
      <div className="drumhaus-root">
        <div
          className="drumhaus-scale-wrapper"
          style={{ transform: `scale(${scale})` }}
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={FADE_IN_VARIANTS}
            transition={{ duration: 0.5 }}
          >
            <Box
              bg="silver"
              w={1538}
              h={1000}
              borderRadius="12px"
              className="neumorphicExtraTall"
              overflow="clip"
              position="relative"
            >
              <TopBar />

              <MainControls
                isPlaying={isPlaying}
                togglePlay={togglePlay}
                instrumentRuntimes={instrumentRuntimes.current}
                instrumentRuntimesVersion={instrumentRuntimesVersion}
                loadPreset={loadPreset}
              />

              <SequencerSection />

              <BrandingLink />
            </Box>
            <Box h="20px" w="100%" position="relative">
              <Footer />
            </Box>
          </motion.div>
        </div>
      </div>
      <MobileModal
        isOpen={isMobileWarning}
        onClose={() => setIsMobileWarning(false)}
      />
    </>
  );
};

const TopBar = () => {
  return (
    <Box
      h="120px"
      boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)"
      position="relative"
    >
      <Flex
        position="relative"
        h="120px"
        w="750px"
        flexDir="row"
        alignItems="flex-end"
        pl="26px"
        pb="20px"
      >
        <Box display="flex" alignItems="flex-end">
          <DrumhausLogo size={46} color="#ff7b00" />
        </Box>
        <Box ml={2} display="flex" alignItems="flex-end">
          <DrumhausTypographyLogo color="#ff7b00" size={420} />
        </Box>
        <Box mb={-1} ml={4}>
          <Text color="gray" opacity={0.7}>
            Browser Controlled
          </Text>
          <Text color="gray" opacity={0.7}>
            Rhythmic Groove Machine
          </Text>
        </Box>
      </Flex>

      <Box
        position="absolute"
        right="26px"
        bottom="18px"
        borderRadius="16px"
        overflow="hidden"
        opacity={0.6}
        boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
      >
        <FrequencyAnalyzer />
      </Box>
    </Box>
  );
};

interface MainControlsProps {
  isPlaying: boolean;
  togglePlay: (instrumentRuntimes: InstrumentRuntime[]) => void;
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  loadPreset: (preset: PresetFileV1) => void;
}

const MainControls = ({
  isPlaying,
  togglePlay,
  instrumentRuntimes,
  instrumentRuntimesVersion,
  loadPreset,
}: MainControlsProps) => {
  return (
    <>
      <Box boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)">
        <InstrumentGrid
          key={instrumentRuntimesVersion}
          instrumentRuntimes={instrumentRuntimes}
        />
      </Box>

      <Grid templateColumns="repeat(7, 1fr)" pl={4} py={4} w="100%">
        <GridItem colSpan={1} w="160px" mr={6}>
          <Center w="100%" h="100%">
            <Button
              h="140px"
              w="140px"
              onClick={() => togglePlay(instrumentRuntimes)}
              className="neumorphicTallRaised"
              outline="none"
              onKeyDown={(ev) => ev.preventDefault()}
            >
              {isPlaying ? (
                <IoPauseSharp size={50} color="#ff7b00" />
              ) : (
                <IoPlaySharp size={50} color="#B09374" />
              )}
            </Button>
          </Center>
        </GridItem>

        <GridItem colSpan={1} mx={0} ml={-3}>
          <SequencerControl />
        </GridItem>

        <GridItem colSpan={1} px={2}>
          <TransportControl />
        </GridItem>

        <GridItem w="380px" px={2}>
          <PresetControl loadPreset={loadPreset} />
        </GridItem>

        <MasterControl />
      </Grid>
    </>
  );
};

const SequencerSection = () => {
  return (
    <Box p={8} boxShadow="0 4px 8px rgba(176, 147, 116, 0.6)">
      <Sequencer />
    </Box>
  );
};

const BrandingLink = () => {
  return (
    <Box
      position="absolute"
      right="26px"
      bottom={3}
      opacity={0.2}
      as="a"
      href="https://fung.studio/"
      target="_blank"
    >
      <FungPeaceLogo color="#B09374" size={80} />
    </Box>
  );
};

const Footer = () => {
  return (
    <Center w="100%" h="100%">
      <Flex mt={8}>
        <Text color="gray" fontSize={14}>
          Designed with love by
        </Text>
        <Link
          href="https://fung.studio/"
          target="_blank"
          color="gray"
          ml={1}
          fontSize={14}
        >
          Max Fung.
        </Link>
        <Link
          href="https://ko-fi.com/maxfung"
          target="_blank"
          color="gray"
          ml={1}
          fontSize={14}
        >
          Support on ko-fi.
        </Link>
      </Flex>
    </Center>
  );
};

export default Drumhaus;
