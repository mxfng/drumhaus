import { now } from "tone/build/esm/index";

import { instrumentDecayMapping, tuneMapping } from "@/shared/knob/lib/mapping";
import { getCurrentTime } from "../transport/transport";
import type { InstrumentData, InstrumentRuntime } from "./types";

// -----------------------------------------------------------------------------
// Instrument triggering
// -----------------------------------------------------------------------------

/**
 * Unified instrument trigger function used by all playback paths.
 * Enforces monophonic behavior and triggers envelope + sampler in sync.
 *
 * This ensures consistent behavior across manual playback, sequencer playback,
 * and any other trigger sources.
 *
 * Note that the inputs to this function are the domain values, not the knob values.
 * Be sure to convert knob values from state with mapping functions before calling this function.
 */
export function triggerInstrumentAtTime(
  runtime: InstrumentRuntime,
  tune: number,
  decay: number,
  time: number,
  velocity: number = 1,
): void {
  // Enforce monophonic behavior - stop any previous notes for all pitches
  triggerInstrumentReleaseAtTime(runtime, time);

  // Trigger envelope and sampler in sync
  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(time + decay);
  runtime.samplerNode.triggerAttack(tune, time, velocity);
}

/**
 * Triggers an instrument runtime for preview/manual playback.
 */
export async function triggerInstrument(
  runtime: InstrumentRuntime,
  tune: number,
  decay: number,
) {
  if (!runtime.samplerNode.loaded) {
    return;
  }

  const time = now();
  const tuneValue = tuneMapping.knobToDomain(tune);
  const decayValue = instrumentDecayMapping.knobToDomain(decay);

  triggerInstrumentAtTime(runtime, tuneValue, decayValue, time);
}

// -----------------------------------------------------------------------------
// Runtime stopping
// -----------------------------------------------------------------------------

/**
 * Immediately cancel envelope ramps and release all sampler voices at a specific time.
 * Keeps timing deterministic by letting callers supply the scheduled time.
 *
 * This function accesses Tone.js private internals to ensure complete audio cleanup.
 * The standard public API (cancel, triggerRelease, releaseAll) doesn't always fully
 * stop ongoing envelopes and buffer sources, so we need to access internals for
 * reliable stopping behavior.
 */
export function triggerInstrumentReleaseAtTime(
  runtime: InstrumentRuntime,
  time: number,
): void {
  const stopTime = Math.max(0, time);
  const env = runtime.envelopeNode;

  // Cancel any scheduled envelope changes
  env.cancel(stopTime);

  // Access internal signal to ensure complete cancellation of automation
  const internalSignal = getEnvelopeInternalSignal(env);
  if (internalSignal) {
    internalSignal.cancelScheduledValues?.(stopTime);
    internalSignal.setValueAtTime?.(0, stopTime);
  }

  // Release the envelope and all sampler voices
  env.triggerRelease(stopTime);
  runtime.samplerNode.releaseAll(stopTime);

  // Hard stop any lingering buffer sources and clear internal tracking
  // This prevents audio from resuming unexpectedly
  const activeSourcesMap = getSamplerActiveSources(runtime.samplerNode);
  if (activeSourcesMap) {
    activeSourcesMap.forEach((sources) => {
      while (sources.length) {
        const source = sources.shift();
        source?.stop(stopTime);
      }
    });
  }
}

/**
 * Releases all samples on all instrument runtimes. Used when stopping playback to prevent audio from continuing
 */
export function triggerAllInstrumentsReleaseAtTime(
  runtimes: InstrumentRuntime[],
  time: number = getCurrentTime(),
): void {
  runtimes.forEach((runtime) => {
    triggerInstrumentReleaseAtTime(runtime, time);
  });
}

// -----------------------------------------------------------------------------
// Hat Muting Logic
// -----------------------------------------------------------------------------

/**
 * Finds the open hat instrument in the current kit.
 * Used to determine if closed hat should mute the open hat (TR-909 style).
 */
export function getOHatVoiceIndex(
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
): { hasOhat: boolean; ohatIndex: number } {
  const ohatIndex = instruments.findIndex(
    (instrument) => instrument.role === "ohat",
  );
  return {
    hasOhat: ohatIndex !== -1 && Boolean(runtimes[ohatIndex]),
    ohatIndex,
  };
}

/**
 * A convenience function to release the open hat at a specific time.
 * Called when closed hat is triggered (TR-909 style hat choking).
 */
export function triggerOHatReleaseAtTime(
  time: number,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  ohatIndex: number,
): void {
  const ohInst = instruments[ohatIndex];
  const ohRuntime = runtimes[ohatIndex];
  if (!ohInst || !ohRuntime) return;

  const ohTune = tuneMapping.knobToDomain(ohInst.params.tune);
  ohRuntime.samplerNode.triggerRelease(ohTune, time);
}

// -----------------------------------------------------------------------------
// Internal Tone.js types
// -----------------------------------------------------------------------------

/**
 * Internal Tone.js types for accessing private APIs.
 * These are implementation details that may change between Tone.js versions.
 *
 * @warning These types are based on Tone.js internals and are not part of the public API.
 * Update these if Tone.js changes its internal structure.
 */
interface ToneEnvelopeInternal {
  _sig?: {
    cancelScheduledValues?: (time: number) => void;
    setValueAtTime?: (value: number, time: number) => void;
  };
}

interface ToneBufferSource {
  stop: (time: number) => void;
}

interface ToneSamplerInternal {
  _activeSources?: Map<number, ToneBufferSource[]>;
}

/**
 * Safely access internal envelope signal for cancellation.
 * Returns undefined if the internal structure doesn't match expectations.
 */
function getEnvelopeInternalSignal(
  env: InstrumentRuntime["envelopeNode"],
): ToneEnvelopeInternal["_sig"] | undefined {
  const internal = env as unknown as ToneEnvelopeInternal;
  return internal._sig;
}

/**
 * Safely access internal sampler sources map for hard stopping.
 * Returns undefined if the internal structure doesn't match expectations.
 */
function getSamplerActiveSources(
  sampler: InstrumentRuntime["samplerNode"],
): ToneSamplerInternal["_activeSources"] | undefined {
  const internal = sampler as unknown as ToneSamplerInternal;
  return internal._activeSources;
}
