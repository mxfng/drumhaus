import { RefObject, useCallback, useEffect, useRef } from "react";

import { InstrumentRuntime } from "@/core/audio/engine/instrument/types";
import { init } from "@/core/dh";
import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { useMasterChainStore } from "@/features/master-bus/store/useMasterChainStore";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import {
  DEFAULT_CHAIN,
  legacyCycleToChain,
  sanitizeChain,
} from "@/features/sequencer/lib/chain";
import {
  migrateMasterChainParams,
  migratePattern,
} from "@/features/sequencer/lib/migrations";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { useToast } from "@/shared/ui";

interface UsePresetLoadingProps {
  instrumentRuntimes: RefObject<InstrumentRuntime[]>;
}

interface UsePresetLoadingResult {
  loadPreset: (preset: PresetFileV1) => void;
}

/**
 * Loads a preset and updates all stores
 *
 * Low-level: handles audio engine, playback stopping, store updates
 */
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

  const setVoiceMode = usePatternStore((state) => state.setVoiceMode);
  const setVariation = usePatternStore((state) => state.setVariation);
  const setPattern = usePatternStore((state) => state.setPattern);
  const setChain = usePatternStore((state) => state.setChain);
  const setChainEnabled = usePatternStore((state) => state.setChainEnabled);

  const setAllMasterChain = useMasterChainStore(
    (state) => state.setAllMasterChain,
  );

  const loadPresetMeta = usePresetMetaStore((state) => state.loadPreset);
  const addCustomPreset = usePresetMetaStore((state) => state.addCustomPreset);

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

      // Add to custom presets if not a default preset
      const defaultPresets = getDefaultPresets();
      const isCustomPreset = !defaultPresets.some(
        (p) => p.meta.id === preset.meta.id,
      );
      if (isCustomPreset) {
        addCustomPreset(preset);
      }

      // Update metadata
      loadPresetMeta(preset);

      // Update sequencer
      setVoiceMode(0);
      const migratedPattern = migratePattern(preset.sequencer.pattern);
      const legacyCycle = legacyCycleToChain(
        preset.sequencer.variationCycle,
        0,
      );
      const chain = sanitizeChain(
        preset.sequencer.chain ?? legacyCycle.chain ?? DEFAULT_CHAIN,
      );
      const initialVariation =
        chain.steps[0]?.variation ?? legacyCycle.variation ?? 0;

      setVariation(initialVariation);
      setPattern(migratedPattern);
      setChain(chain);
      setChainEnabled(
        preset.sequencer.chainEnabled ?? legacyCycle.chainEnabled ?? false,
      );

      // Update transport
      setBpm(preset.transport.bpm);
      setSwing(preset.transport.swing);

      // Update master chain (with migration for legacy formats)
      setAllMasterChain(migrateMasterChainParams(preset.masterChain));

      // Update instruments (triggers audio engine reload)
      setAllInstruments(preset.kit.instruments);
    },
    [
      instrumentRuntimes,
      isPlaying,
      addCustomPreset,
      loadPresetMeta,
      setAllInstruments,
      setAllMasterChain,
      setBpm,
      setPattern,
      setSwing,
      setChain,
      setChainEnabled,
      setVariation,
      setVoiceMode,
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
      const { urlToPreset } =
        await import("@/features/preset/lib/serialization");
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
