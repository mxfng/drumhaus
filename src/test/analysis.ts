/**
 * Audio buffer analysis helpers for golden render tests.
 * Pure math over AudioBuffer contents - no Tone.js, no DOM beyond the
 * AudioBuffer interface itself.
 */

interface FindOnsetsOptions {
  /** Absolute amplitude that counts as signal. */
  threshold?: number;
  /**
   * Minimum continuous time below threshold before a new crossing counts as
   * a distinct onset. 8ms resolves two onsets 15ms apart (flam).
   */
  refractoryMs?: number;
}

function mixToMono(buffer: AudioBuffer): Float32Array {
  const channelCount = buffer.numberOfChannels;
  const mono = new Float32Array(buffer.length);
  for (let ch = 0; ch < channelCount; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      mono[i] += data[i] / channelCount;
    }
  }
  return mono;
}

/**
 * Returns times (seconds) where abs(sample) first crosses the threshold
 * after having been below it for at least refractoryMs.
 */
function findOnsets(
  buffer: AudioBuffer,
  options: FindOnsetsOptions = {},
): number[] {
  const { threshold = 0.02, refractoryMs = 8 } = options;
  const mono = mixToMono(buffer);
  const refractorySamples = Math.ceil(
    (refractoryMs / 1000) * buffer.sampleRate,
  );

  const onsets: number[] = [];
  // Treat the start of the buffer as an arbitrarily long silence so the
  // first crossing always registers.
  let samplesBelow = refractorySamples;

  for (let i = 0; i < mono.length; i++) {
    if (Math.abs(mono[i]) >= threshold) {
      if (samplesBelow >= refractorySamples) {
        onsets.push(i / buffer.sampleRate);
      }
      samplesBelow = 0;
    } else {
      samplesBelow++;
    }
  }

  return onsets;
}

function windowIndices(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): { start: number; end: number } {
  const start = Math.max(0, Math.floor(startSec * buffer.sampleRate));
  const end = Math.min(buffer.length, Math.ceil(endSec * buffer.sampleRate));
  return { start, end };
}

/**
 * Peak absolute amplitude of the mono mix within [startSec, endSec).
 */
function peakInWindow(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): number {
  const mono = mixToMono(buffer);
  const { start, end } = windowIndices(buffer, startSec, endSec);
  let peak = 0;
  for (let i = start; i < end; i++) {
    peak = Math.max(peak, Math.abs(mono[i]));
  }
  return peak;
}

/**
 * Peak absolute sample amplitude across ALL channels of the buffer (linear,
 * 1.0 = 0 dBFS). Unlike peakInWindow this does not mix to mono: PCM encoding
 * clips per channel, so clipping headroom must be measured per channel.
 */
function peakAmplitude(buffer: AudioBuffer): number {
  let peak = 0;
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }
  return peak;
}

/**
 * RMS of the mono mix within [startSec, endSec).
 */
function rmsInWindow(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
): number {
  const mono = mixToMono(buffer);
  const { start, end } = windowIndices(buffer, startSec, endSec);
  if (end <= start) return 0;
  let sumSquares = 0;
  for (let i = start; i < end; i++) {
    sumSquares += mono[i] * mono[i];
  }
  return Math.sqrt(sumSquares / (end - start));
}

export { findOnsets, peakAmplitude, peakInWindow, rmsInWindow };
export type { FindOnsetsOptions };
