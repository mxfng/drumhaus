import * as Tone from "tone/build/esm/index";

import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import { stopRuntimeAtTime } from "./runtimeStops";

/**
 * Release all active voices on non-solo instruments so soloing immediately silences them.
 */
export function releaseNonSoloRuntimes(
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  time: number = Tone.now(),
): void {
  if (runtimes.length === 0) return;

  for (let i = 0; i < runtimes.length; i++) {
    const runtime = runtimes[i];
    const instrument = instruments[i];
    if (!runtime || !instrument) continue;
    if (instrument.params.solo) continue;

    stopRuntimeAtTime(runtime, time);
  }
}

/**
 * Checks if any instrument has solo enabled.
 */
export function hasAnySolo(instruments: InstrumentData[]): boolean {
  return instruments.some((inst) => inst.params.solo);
}

/**
 * Extracts solo states from instruments for comparison.
 */
export function getSoloStates(instruments: InstrumentData[]): boolean[] {
  return instruments.map((inst) => inst.params.solo);
}

/**
 * Checks if solo states have changed between two snapshots.
 */
export function soloStatesChanged(
  prevStates: boolean[],
  currentStates: boolean[],
): boolean {
  if (prevStates.length !== currentStates.length) return true;
  return currentStates.some((val, idx) => val !== prevStates[idx]);
}

/**
 * Creates a solo change handler that can be used with store subscriptions.
 * Returns a function that processes instrument state and calls the callback
 * when solo state changes to enabled.
 */
export function createSoloChangeHandler(
  getRuntimes: () => InstrumentRuntime[],
  onSoloEnabled: (
    instruments: InstrumentData[],
    runtimes: InstrumentRuntime[],
  ) => void,
): {
  handleStateChange: (instruments: InstrumentData[]) => void;
  getInitialState: (instruments: InstrumentData[]) => boolean[];
} {
  let prevSoloStates: boolean[] = [];

  return {
    getInitialState: (instruments: InstrumentData[]) => {
      prevSoloStates = getSoloStates(instruments);
      return prevSoloStates;
    },
    handleStateChange: (instruments: InstrumentData[]) => {
      const currentSoloStates = getSoloStates(instruments);
      const hasSolo = currentSoloStates.some(Boolean);
      const changed = soloStatesChanged(prevSoloStates, currentSoloStates);

      if (hasSolo && changed) {
        onSoloEnabled(instruments, getRuntimes());
      }

      prevSoloStates = currentSoloStates;
    },
  };
}
