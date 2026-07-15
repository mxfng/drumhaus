import { useEffect } from "react";
import { shallow } from "zustand/shallow";

import { getAudioEngine } from "@/core/audio/engine";
import {
  getMasterChainParams,
  useMasterChainStore,
} from "@/features/master-bus/store/use-master-chain-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { useAudioContextGuards } from "../hooks/use-audio-context-guards";
import {
  mapMasterToSettings,
  type MasterChainCanonical,
} from "./engine-params";
import { subscribeInstrumentParamsToEngine } from "./instrument-params";
import { subscribeKitToEngine } from "./kit-subscription";

/**
 * The bridge between the Zustand stores and the AudioEngine facade.
 *
 * Initializes the engine, wires store subscriptions to engine commands
 * (pattern, playback config, per-channel params, kit loads, master chain),
 * and mirrors engine events back into the stores. Components never see
 * engine internals; they address channels by index through engine commands
 * and small bridge hooks (useKitVersion).
 */
function useEngineBridge(): void {
  // Guard and recover audio context automatically (visibility/gestures/stall)
  useAudioContextGuards();

  // Engine lifecycle + store wiring (store subscriptions -> engine commands)
  useEffect(() => {
    const engine = getAudioEngine();
    void engine.init(mapMasterToSettings(getMasterChainParams()));

    const unsubscribers: (() => void)[] = [];

    // --- Pattern ---
    let prevPattern = usePatternStore.getState().pattern;
    engine.setPattern(prevPattern);
    unsubscribers.push(
      usePatternStore.subscribe((state) => {
        if (state.pattern !== prevPattern) {
          prevPattern = state.pattern;
          engine.setPattern(state.pattern);
        }
      }),
    );

    // --- Playback config (chain / chainEnabled / variation) ---
    let prevPlayback = {
      chain: usePatternStore.getState().chain,
      chainEnabled: usePatternStore.getState().chainEnabled,
      variation: usePatternStore.getState().variation,
    };
    engine.setPlayback(prevPlayback);
    unsubscribers.push(
      usePatternStore.subscribe((state) => {
        const playback = {
          chain: state.chain,
          chainEnabled: state.chainEnabled,
          variation: state.variation,
        };
        if (!shallow(prevPlayback, playback)) {
          prevPlayback = playback;
          engine.setPlayback(playback);
        }
      }),
    );

    // --- Instrument params (continuous + play params, knob -> domain) ---
    unsubscribers.push(subscribeInstrumentParamsToEngine(engine));

    // --- Kit (descriptor-keyed loads + failure rollback, decision 5) ---
    unsubscribers.push(subscribeKitToEngine(engine));

    // --- Master chain ---
    let prevMasterParams: MasterChainCanonical | null = null;
    unsubscribers.push(
      useMasterChainStore.subscribe(() => {
        const params = getMasterChainParams();
        if (prevMasterParams && shallow(prevMasterParams, params)) {
          return;
        }
        prevMasterParams = params;
        engine.setMasterSettings(mapMasterToSettings(params));
      }),
    );

    // --- Engine events -> stores ---
    unsubscribers.push(
      engine.onPlaybackVariationChange((variation) => {
        const patternStore = usePatternStore.getState();
        if (patternStore.playbackVariation !== variation) {
          patternStore.setPlaybackVariation(variation);
        }
      }),
    );

    // Mirror engine-initiated playback transitions (e.g. a rebuild that
    // does not replay, or a replay that fails) into the transport store.
    // The store keeps its command role (togglePlay drives the engine); the
    // value-changed guard prevents store-issued commands from echoing.
    unsubscribers.push(
      engine.onPlaybackStateChange((isPlaying) => {
        if (useTransportStore.getState().isPlaying !== isPlaying) {
          useTransportStore.setState({ isPlaying });
        }
      }),
    );

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      engine.dispose();
    };
  }, []);
}

export { useEngineBridge };
