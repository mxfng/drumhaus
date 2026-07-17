/**
 * Quarantined Tone.js private-API access.
 *
 * This file must remain the ONLY place in the codebase that touches Tone.js
 * private internals (pinned to tone 15.5.25).
 *
 * These are implementation details that may change between Tone.js versions.
 *
 * @warning These types are based on Tone.js internals and are not part of the
 * public API. Update these if Tone.js changes its internal structure.
 */

import type { AmplitudeEnvelope, Sampler } from "tone/build/esm/index";

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
 * Tone's live Context.rawContext is a standardized-audio-context wrapper
 * (tone's pinned dependency), which keeps the browser AudioContext it
 * wraps in _nativeAudioContext (its base class uses _nativeContext).
 */
interface StandardizedAudioContextInternal {
  _nativeAudioContext?: unknown;
  _nativeContext?: unknown;
}

/**
 * Safely access internal envelope signal for cancellation.
 * Returns undefined if the internal structure doesn't match expectations.
 */
function getEnvelopeInternalSignal(
  env: AmplitudeEnvelope,
): ToneEnvelopeInternal["_sig"] | undefined {
  const internal = env as unknown as ToneEnvelopeInternal;
  return internal._sig;
}

/**
 * Safely access internal sampler sources map for hard stopping.
 * Returns undefined if the internal structure doesn't match expectations.
 */
function getSamplerActiveSources(
  sampler: Sampler,
): ToneSamplerInternal["_activeSources"] | undefined {
  const internal = sampler as unknown as ToneSamplerInternal;
  return internal._activeSources;
}

/**
 * Safely reach the NATIVE AudioContext beneath Tone's rawContext.
 *
 * The standardized-audio-context wrapper does not implement
 * getOutputTimestamp, so an epoch<->context clock mapping anchored on it
 * falls back to currentTime and cannot compensate for output latency -
 * grid-aligned playback then lands late at the speaker by exactly that
 * latency (issue #425). The native context underneath carries the real
 * getOutputTimestamp; scheduling times are interchangeable because the
 * wrapper's currentTime IS the native context's clock.
 *
 * Returns undefined when the internal structure doesn't match
 * expectations, so callers can fall back to the wrapper (losing only the
 * latency compensation, not correctness of the clock).
 */
function getNativeAudioContext(
  context: BaseAudioContext,
): AudioContext | undefined {
  const internal = context as unknown as StandardizedAudioContextInternal;
  const candidate = internal._nativeAudioContext ?? internal._nativeContext;
  if (
    candidate instanceof AudioContext &&
    typeof candidate.getOutputTimestamp === "function"
  ) {
    return candidate;
  }
  return undefined;
}

export {
  getEnvelopeInternalSignal,
  getNativeAudioContext,
  getSamplerActiveSources,
};
