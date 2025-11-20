import { useCallback, useEffect } from "react";
import { Box, Text, useToast } from "@chakra-ui/react";

import { init } from "@/lib/preset";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";

interface UsePresetLoadingProps {
  instrumentRuntimes: React.MutableRefObject<InstrumentRuntime[]>;
}

interface UsePresetLoadingResult {
  loadPreset: (preset: PresetFileV1) => void;
}

export function usePresetLoading({
  instrumentRuntimes,
}: UsePresetLoadingProps): UsePresetLoadingResult {
  const toast = useToast({ position: "top" });

  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const setBpm = useTransportStore((state) => state.setBpm);
  const setSwing = useTransportStore((state) => state.setSwing);

  const setAllInstruments = useInstrumentsStore(
    (state) => state.setAllInstruments,
  );

  const setVoiceIndex = usePatternStore((state) => state.setVoiceIndex);
  const setVariation = usePatternStore((state) => state.setVariation);
  const setPattern = usePatternStore((state) => state.setPattern);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);

  const setAllMasterChain = useMasterChainStore(
    (state) => state.setAllMasterChain,
  );

  const loadPresetMeta = usePresetMetaStore((state) => state.loadPreset);

  const showSharedPresetToast = useCallback(
    (presetName: string) => {
      toast({
        render: () => (
          <Box
            bg="silver"
            color="gray"
            p={3}
            borderRadius="8px"
            className="neumorphic"
          >
            <Text>{`You received a custom preset called "${presetName}"!`}</Text>
          </Box>
        ),
      });
    },
    [toast],
  );

  const showSharedPresetErrorToast = useCallback(() => {
    toast({
      render: () => (
        <Box
          bg="silver"
          color="gray"
          p={3}
          borderRadius="8px"
          className="neumorphic"
        >
          <Text>Failed to load shared preset. Loading default.</Text>
        </Box>
      ),
    });
  }, [toast]);

  const loadPreset = useCallback(
    (preset: PresetFileV1) => {
      // Stop playback if currently playing (samples will reload)
      if (isPlaying) {
        togglePlay(instrumentRuntimes.current);
      }

      // Update metadata
      loadPresetMeta(preset);

      // Update sequencer
      setVoiceIndex(0);
      setVariation(0);
      setPattern(preset.sequencer.pattern);
      setVariationCycle(preset.sequencer.variationCycle);

      // Update transport
      setBpm(preset.transport.bpm);
      setSwing(preset.transport.swing);

      // Update master chain
      setAllMasterChain(
        preset.masterChain.lowPass,
        preset.masterChain.hiPass,
        preset.masterChain.phaser,
        preset.masterChain.reverb,
        preset.masterChain.compThreshold,
        preset.masterChain.compRatio,
        preset.masterChain.masterVolume,
      );

      // Update instruments (triggers audio engine reload)
      setAllInstruments(preset.kit.instruments);
    },
    [
      instrumentRuntimes,
      isPlaying,
      loadPresetMeta,
      setAllInstruments,
      setAllMasterChain,
      setBpm,
      setPattern,
      setSwing,
      setVariation,
      setVariationCycle,
      setVoiceIndex,
      togglePlay,
    ],
  );

  const loadFromUrlOrDefault = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const presetParam = urlParams.get("p");

    if (!presetParam) {
      // Check if we have persisted store values in localStorage
      const hasPersistedData =
        typeof window !== "undefined" &&
        localStorage.getItem("drumhaus-preset-meta-storage") !== null;

      // TODO: Add validation to check if the persisted data is valid
      // This could potentially lead to corrupted projects if any states
      // are malformed.

      if (!hasPersistedData) {
        // No persisted data, load default init preset
        loadPreset(init());
      }
      return;
    }

    try {
      const { urlToPreset } = await import("@/lib/serialization");
      const preset = urlToPreset(presetParam);
      loadPreset(preset);

      showSharedPresetToast(preset.meta.name);
    } catch (error) {
      console.error("Failed to load shared preset:", error);

      showSharedPresetErrorToast();
      loadPreset(init());
    } finally {
      // Remove URL parameters after loading preset
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      url.searchParams.delete("n");
      window.history.replaceState({}, "", url.toString());
    }
  }, [loadPreset, showSharedPresetErrorToast, showSharedPresetToast]);

  // Load initial preset on mount
  useEffect(() => {
    void loadFromUrlOrDefault();
  }, [loadFromUrlOrDefault]);

  return { loadPreset };
}
