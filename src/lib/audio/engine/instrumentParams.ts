import {
  attackMapping,
  instrumentVolumeMapping,
  panMapping,
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
  runtime.envelopeNode.attack = attackMapping.stepToValue(params.attack);

  runtime.filterNode.type =
    params.filter <= KNOB_ROTATION_THRESHOLD_L ? "lowpass" : "highpass";
  runtime.filterNode.frequency.value = splitFilterMapping.stepToValue(
    params.filter,
  );

  runtime.pannerNode.pan.value = panMapping.stepToValue(params.pan);

  runtime.samplerNode.volume.value = instrumentVolumeMapping.stepToValue(
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
