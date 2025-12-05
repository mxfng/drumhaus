import { applySplitFilterWithRamp } from "@/core/audio/engine/fx/splitFilter";
import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import {
  instrumentPanMapping,
  instrumentVolumeMapping,
} from "@/shared/knob/lib/mapping";
import { INSTRUMENT_FILTER_RANGE } from "../constants";
import type { InstrumentRuntime } from "./types";

/**
 * Instrument parameters fall into two categories:
 *
 * 1. CONTINUOUS PARAMS (defined here):
 *    - Applied directly to audio nodes and stay active
 *    - Updated via subscription when store changes
 *    - Examples: filter, pan, volume
 *
 * 2. PER-NOTE PARAMS (handled in drumSequence.ts):
 *    - Read from store during playback for each triggered note
 *    - Not applied to audio nodes in advance
 *    - Examples: tune, decay, solo, mute
 */
export interface ContinuousRuntimeParams {
  filter: number;
  pan: number;
  volume: number;
}

/**
 * Applies continuous instrument params to audio nodes.
 * Does NOT handle per-note params (tune, decay, solo, mute) -
 * those are read during playback in drumSequence.ts
 */
export function applyInstrumentParams(
  runtime: InstrumentRuntime,
  params: ContinuousRuntimeParams,
): void {
  applySplitFilterWithRamp(
    runtime.lowPassFilterNode,
    runtime.highPassFilterNode,
    params.filter,
    {
      minFrequency: INSTRUMENT_FILTER_RANGE[0],
      maxFrequency: INSTRUMENT_FILTER_RANGE[1],
    },
  );

  runtime.pannerNode.pan.value = instrumentPanMapping.knobToDomain(params.pan);

  // Knob at 0 = true silence (-Infinity dB), otherwise use normal transform
  runtime.samplerNode.volume.value = instrumentVolumeMapping.knobToDomain(
    params.volume,
  );
}

/**
 * Subscribes a runtime to continuous params from the store.
 * Only syncs params that are applied to audio nodes (filter, pan, volume).
 * Per-note params (tune, decay, solo, mute) are NOT synced here - they're read
 * during playback in drumSequence.ts
 */
export function subscribeRuntimeToInstrumentParams(
  index: number,
  runtime: InstrumentRuntime,
): () => void {
  let prevParams: ContinuousRuntimeParams | null = null;

  const applyParamsIfChanged = (params: ContinuousRuntimeParams) => {
    if (
      prevParams &&
      prevParams.filter === params.filter &&
      prevParams.pan === params.pan &&
      prevParams.volume === params.volume
    ) {
      return;
    }

    applyInstrumentParams(runtime, params);
    prevParams = params;
  };

  const unsubscribe = useInstrumentsStore.subscribe((state) => {
    const instrument = state.instruments[index];
    if (!instrument) return;

    // Only pass continuous params - per-note params are read during playback
    applyParamsIfChanged({
      filter: instrument.params.filter,
      pan: instrument.params.pan,
      volume: instrument.params.volume,
    });
  });

  // Apply current state immediately
  const currentInstrument = useInstrumentsStore.getState().instruments[index];
  if (currentInstrument) {
    applyParamsIfChanged({
      filter: currentInstrument.params.filter,
      pan: currentInstrument.params.pan,
      volume: currentInstrument.params.volume,
    });
  }

  return unsubscribe;
}
