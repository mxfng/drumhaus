/**
 * Bridge between the instruments store and the audio engine.
 *
 * Subscribes to the instruments store and pushes each channel's params into
 * the engine, converting knob values to domain values at this boundary:
 * - continuous params (filter, pan, volume) are applied to audio nodes
 * - play params (tune, decay, mute, solo) are retained engine-side and read
 *   by the scheduler on every trigger
 */

import type { AudioEngine } from "@/core/audio/engine/audio-engine";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import {
  instrumentKnobsToContinuousParams,
  instrumentKnobsToPlayParams,
} from "./knob-to-domain";

/** Raw knob values used to detect changes; conversion happens on push. */
interface ContinuousKnobParams {
  filter: number;
  pan: number;
  volume: number;
}

/** Raw knob values used to detect changes; conversion happens on push. */
interface PlayKnobParams {
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
  const prevContinuous: (ContinuousKnobParams | undefined)[] = [];
  const prevPlay: (PlayKnobParams | undefined)[] = [];

  const pushIfChanged = (index: number, params: InstrumentParams) => {
    const continuous = prevContinuous[index];
    if (
      !continuous ||
      continuous.filter !== params.filter ||
      continuous.pan !== params.pan ||
      continuous.volume !== params.volume
    ) {
      engine.setChannelContinuousParams(
        index,
        instrumentKnobsToContinuousParams(params),
      );
      prevContinuous[index] = {
        filter: params.filter,
        pan: params.pan,
        volume: params.volume,
      };
    }

    const play = prevPlay[index];
    if (
      !play ||
      play.tune !== params.tune ||
      play.decay !== params.decay ||
      play.mute !== params.mute ||
      play.solo !== params.solo
    ) {
      engine.setChannelPlayParams(index, instrumentKnobsToPlayParams(params));
      prevPlay[index] = {
        tune: params.tune,
        decay: params.decay,
        mute: params.mute,
        solo: params.solo,
      };
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
