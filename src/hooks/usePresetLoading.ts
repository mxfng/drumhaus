import { RefObject, useCallback, useEffect, useRef } from "react";

import { useToast } from "@/components/ui";
import { init } from "@/lib/preset";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { PresetFileV1 } from "@/types/preset";

interface UsePresetLoadingProps {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
}

interface UsePresetLoadingResult {
  loadPreset: (preset: PresetFileV1) => void;
}

export function usePresetLoading({
  instrumentRuntimes,
}: UsePresetLoadingProps): UsePresetLoadingResult {
  const { toast } = useToast();
  const hasLoadedFromUrlRef = useRef(false);

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
        title: `Loaded shared preset "${presetName}"`,
      });
    },
    [toast],
  );

  const showSharedPresetErrorToast = useCallback(() => {
    toast({
      title: "Something went wrong",
      description: "Couldn't load shared preset. The link may be invalid.",
      status: "error",
      duration: 8000,
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
      setAllMasterChain(preset.masterChain);

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
    // Prevent duplicate execution
    if (hasLoadedFromUrlRef.current) {
      return;
    }

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
      hasLoadedFromUrlRef.current = true;
      return;
    }

    // Mark as loaded before async operations to prevent race conditions
    hasLoadedFromUrlRef.current = true;

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
