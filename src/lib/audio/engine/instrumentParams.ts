import {
  KNOB_ROTATION_THRESHOLD_L,
  transformKnobFilterValue,
  transformKnobValue,
} from "@/components/common/Knob";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import {
  INSTRUMENT_ATTACK_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_VOLUME_RANGE,
} from "./constants";

type RuntimeParams = {
  attack: number;
  filter: number;
  pan: number;
  volume: number;
};

/**
 * Applies instrument params from the store to a given runtime and keeps it in sync.
 */
export function subscribeRuntimeToInstrumentParams(
  index: number,
  runtime: InstrumentRuntime,
): () => void {
  let prevParams: RuntimeParams | null = null;

  const applyParams = (params: RuntimeParams) => {
    if (
      prevParams &&
      prevParams.attack === params.attack &&
      prevParams.filter === params.filter &&
      prevParams.pan === params.pan &&
      prevParams.volume === params.volume
    ) {
      return;
    }

    runtime.envelopeNode.attack = transformKnobValue(
      params.attack,
      INSTRUMENT_ATTACK_RANGE,
    );

    runtime.filterNode.type =
      params.filter <= KNOB_ROTATION_THRESHOLD_L ? "lowpass" : "highpass";
    runtime.filterNode.frequency.value = transformKnobFilterValue(
      params.filter,
    );

    runtime.pannerNode.pan.value = transformKnobValue(
      params.pan,
      INSTRUMENT_PAN_RANGE,
    );

    runtime.samplerNode.volume.value = transformKnobValue(
      params.volume,
      INSTRUMENT_VOLUME_RANGE,
    );

    prevParams = params;
  };

  const unsubscribe = useInstrumentsStore.subscribe((state) => {
    const instrument = state.instruments[index];
    if (!instrument) return;

    applyParams({
      attack: instrument.params.attack,
      filter: instrument.params.filter,
      pan: instrument.params.pan,
      volume: instrument.params.volume,
    });
  });

  // Apply current state immediately
  const currentInstrument = useInstrumentsStore.getState().instruments[index];
  if (currentInstrument) {
    applyParams({
      attack: currentInstrument.params.attack,
      filter: currentInstrument.params.filter,
      pan: currentInstrument.params.pan,
      volume: currentInstrument.params.volume,
    });
  }

  return unsubscribe;
}
