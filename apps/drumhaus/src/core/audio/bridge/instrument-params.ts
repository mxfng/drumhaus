/**
 * Bridge between the instruments store and the audio engine.
 *
 * Subscribes to the instruments store and pushes each channel's canonical
 * params into the engine:
 * - continuous params (filter, pan, volume) are applied to audio nodes
 * - play params (tune, decay, mute, solo) are retained engine-side and read
 *   by the scheduler on every trigger (tune's semitone offset becomes Hz)
 */

import { shallow } from "zustand/shallow";

import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import type { AudioEngine } from "@/core/audio/engine/audio-engine";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import {
  instrumentContinuousParams,
  instrumentPlayParams,
} from "./engine-params";

/** Canonical values used to detect changes; the push maps them to the engine. */
interface ContinuousChangeKey {
  filter: CanonicalFilter;
  pan: number;
  volume: number;
}

/** Canonical values used to detect changes; the push maps them to the engine. */
interface PlayChangeKey {
  tune: number;
  decay: number;
  mute: boolean;
  solo: boolean;
}

/**
 * Subscribes the engine to instrument params from the store, pushing the
 * current state immediately and again on every change. Per-channel diffing
 * keeps redundant pushes (and audio-node param ramps) out of the engine.
 * Returns an unsubscribe function.
 */
function subscribeInstrumentParamsToEngine(engine: AudioEngine): () => void {
  const prevContinuous: (ContinuousChangeKey | undefined)[] = [];
  const prevPlay: (PlayChangeKey | undefined)[] = [];

  const pushIfChanged = (index: number, params: InstrumentParams) => {
    const continuous: ContinuousChangeKey = {
      filter: params.filter,
      pan: params.pan,
      volume: params.volume,
    };
    if (!shallow(prevContinuous[index], continuous)) {
      engine.setChannelContinuousParams(
        index,
        instrumentContinuousParams(params),
      );
      prevContinuous[index] = continuous;
    }

    const play: PlayChangeKey = {
      tune: params.tune,
      decay: params.decay,
      mute: params.mute,
      solo: params.solo,
    };
    if (!shallow(prevPlay[index], play)) {
      engine.setChannelPlayParams(index, instrumentPlayParams(params));
      prevPlay[index] = play;
    }
  };

  const pushAll = (instruments: { params: InstrumentParams }[]) => {
    instruments.forEach((instrument, index) => {
      pushIfChanged(index, instrument.params);
    });
  };

  // Push current state immediately
  pushAll(useInstrumentsStore.getState().instruments);

  return useInstrumentsStore.subscribe((state) => {
    pushAll(state.instruments);
  });
}

export { subscribeInstrumentParamsToEngine };
