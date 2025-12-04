import { useCallback } from "react";
import { now } from "tone/build/esm/index";

import { stopInstrumentRuntimeAtTime } from "@/core/audio/engine";
import { useInstrumentsStore } from "../../../features/instrument/store/useInstrumentsStore";
import type { InstrumentRuntime } from "../engine/instrument/types";

/**
 * Hook that provides instrument control actions with proper audio cleanup.
 * Encapsulates the coordination between store actions and audio engine operations.
 */
export function useInstrumentControls(
  index: number,
  runtime?: InstrumentRuntime,
) {
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);
  const mute = useInstrumentsStore(
    (state) => state.instruments[index].params.mute,
  );

  const toggleMute = useCallback(() => {
    // Stop any playing audio when muting (not when unmuting)
    if (!mute && runtime?.samplerNode) {
      stopInstrumentRuntimeAtTime(runtime, now());
    }
    toggleMuteStore(index);
  }, [index, mute, runtime, toggleMuteStore]);

  const toggleSolo = useCallback(() => {
    toggleSoloStore(index);
  }, [index, toggleSoloStore]);

  return {
    toggleMute,
    toggleSolo,
  };
}
