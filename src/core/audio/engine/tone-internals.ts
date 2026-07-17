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

/**
 * The tick round-trip surface of the transport clock's frequency
 * TickSignal: exactly the two functions Tone's tick iterator
 * (TickSource.forEachTickBetween) evaluates when it decides whether the
 * tick AT a start instant has "already passed".
 */
interface ClockFrequencyTickMath {
  getTicksAtTime: (time: number) => number;
  getTimeOfTick: (tick: number) => number;
}

interface TransportClockInternal {
  _clock?: {
    frequency?: Partial<ClockFrequencyTickMath>;
    _state?: { cancel?: (time: number) => void };
    _tickSource?: { cancel?: (time: number) => void };
    _lastUpdate?: number;
  };
}

/**
 * Safely reach the transport clock's frequency TickSignal.
 *
 * Used by startTransport to pre-flight Tone's first-tick float guard: when
 * getTimeOfTick(getTicksAtTime(at)) lands one ULP below `at` (float noise
 * that accumulates in the signal's timeline across restarts and tempo
 * writes), Tone skips the tick at `at` entirely and the pattern's first
 * step never fires (issue #440). Reading the same two functions lets the
 * caller nudge `at` by microseconds to a value the guard accepts.
 *
 * Returns undefined when the internal structure doesn't match
 * expectations; callers then schedule unadjusted (status quo).
 */
function getTransportClockTickMath(
  transport: unknown,
): ClockFrequencyTickMath | undefined {
  const frequency = (transport as TransportClockInternal)._clock?.frequency;
  if (
    frequency &&
    typeof frequency.getTicksAtTime === "function" &&
    typeof frequency.getTimeOfTick === "function"
  ) {
    return frequency as ClockFrequencyTickMath;
  }
  return undefined;
}

/**
 * Safely build a canceller for transport clock state at/after a time.
 *
 * Tone's Clock has no public cancel: the only public way to remove a
 * scheduled future start is Clock.stop(time), which ALSO inserts a stopped
 * event at that instant - a stray stop that outlives a superseding start
 * scheduled at any other instant and kills playback when it is reached
 * (issue #440 review). Cancelling on both the clock's state timeline and
 * its tick source removes the pending events and nothing else: no stop is
 * inserted, no completed stop before the time is touched (so the
 * TickSource stop-resurrection branch cannot trigger either).
 *
 * Returns undefined when the internal structure doesn't match
 * expectations; callers then fall back to Clock.stop(pending) - degraded
 * (the stray-stop edge returns) but never worse than pre-#440 behavior.
 */
function getTransportClockCancel(
  transport: unknown,
): ((time: number) => void) | undefined {
  const clock = (transport as TransportClockInternal)._clock;
  const state = clock?._state;
  const tickSource = clock?._tickSource;
  if (
    typeof state?.cancel === "function" &&
    typeof tickSource?.cancel === "function"
  ) {
    return (time) => {
      state.cancel!(time);
      tickSource.cancel!(time);
    };
  }
  return undefined;
}

/**
 * Safely read the transport clock's dispatch watermark: Clock._lastUpdate,
 * the end of the last processed scheduling window. Everything at or below
 * it has been handed to the tick loop; everything above it has not fired
 * yet - which makes it the correct "has this pending start effectively
 * begun?" boundary. now()+lookahead overshoots by the whole lookahead, and
 * treating an undispatched start as begun routes its supersession through
 * the stop path, firing the TickSource resurrection branch once (#440).
 *
 * Returns undefined when the internal structure doesn't match
 * expectations; callers then fall back to now() (the old boundary).
 */
function getTransportClockDispatchWatermark(
  transport: unknown,
): number | undefined {
  const lastUpdate = (transport as TransportClockInternal)._clock?._lastUpdate;
  return typeof lastUpdate === "number" ? lastUpdate : undefined;
}

export {
  getEnvelopeInternalSignal,
  getNativeAudioContext,
  getSamplerActiveSources,
  getTransportClockCancel,
  getTransportClockDispatchWatermark,
  getTransportClockTickMath,
};
export type { ClockFrequencyTickMath };
