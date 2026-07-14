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

export { getEnvelopeInternalSignal, getSamplerActiveSources };
