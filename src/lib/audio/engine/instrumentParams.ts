import {
  instrumentAttackMapping,
  instrumentPanMapping,
  instrumentVolumeMapping,
  splitFilterMapping,
} from "@/lib/knob/mapping";
import { KNOB_ROTATION_THRESHOLD_L } from "@/lib/knob/transform";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";

export type RuntimeParams = {
  attack: number;
  filter: number;
  pan: number;
  volume: number;
};

/**
 * Applies instrument params to a runtime
 */
export function applyInstrumentParams(
  runtime: InstrumentRuntime,
  params: RuntimeParams,
): void {
  runtime.samplerNode.attack = instrumentAttackMapping.knobToDomain(
    params.attack,
  );

  // TODO: Should probably extract this check to the knob library.
  runtime.filterNode.type =
    params.filter <= KNOB_ROTATION_THRESHOLD_L ? "lowpass" : "highpass";
  runtime.filterNode.frequency.value = splitFilterMapping.knobToDomain(
    params.filter,
  );

  runtime.pannerNode.pan.value = instrumentPanMapping.knobToDomain(params.pan);

  // Knob at 0 = true silence (-Infinity dB), otherwise use normal transform
  runtime.samplerNode.volume.value = instrumentVolumeMapping.knobToDomain(
    params.volume,
  );
}

/**
 * Applies instrument params from the store to a given runtime and keeps it in sync.
 */
export function subscribeRuntimeToInstrumentParams(
  index: number,
  runtime: InstrumentRuntime,
): () => void {
  let prevParams: RuntimeParams | null = null;

  const applyParamsIfChanged = (params: RuntimeParams) => {
    if (
      prevParams &&
      prevParams.attack === params.attack &&
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

    applyParamsIfChanged({
      attack: instrument.params.attack,
      filter: instrument.params.filter,
      pan: instrument.params.pan,
      volume: instrument.params.volume,
    });
  });

  // Apply current state immediately
  const currentInstrument = useInstrumentsStore.getState().instruments[index];
  if (currentInstrument) {
    applyParamsIfChanged({
      attack: currentInstrument.params.attack,
      filter: currentInstrument.params.filter,
      pan: currentInstrument.params.pan,
      volume: currentInstrument.params.volume,
    });
  }

  return unsubscribe;
}
