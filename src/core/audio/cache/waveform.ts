import { cacheFetch } from "./common";
import { WAVEFORM_BUCKET_COUNT, WAVEFORM_VALUE_SCALE } from "./constants";

const WAVEFORM_PREFIX = "/waveforms/";
const WAVEFORM_SILENCE_THRESHOLD = 0.005; // drop tail below this fraction of peak

function getWaveformUrl(waveformName: string): string {
  return `${WAVEFORM_PREFIX}${waveformName}.json`;
}

export interface TransientWaveformData {
  version: 1;
  bucketCount: number;
  buckets: number[]; // 0..WAVEFORM_VALUE_SCALE ints
}

type WaveformResponse =
  | TransientWaveformData
  | {
      amplitude_envelope: number[][];
    };

function normalizeWaveformData(data: WaveformResponse): TransientWaveformData {
  if ("buckets" in data) {
    const buckets = data.buckets.map((value) =>
      Math.min(WAVEFORM_VALUE_SCALE, Math.max(0, Math.round(value))),
    );

    return {
      version: 1,
      bucketCount: data.bucketCount ?? buckets.length,
      buckets,
    };
  }

  if ("amplitude_envelope" in data) {
    const firstChannel = data.amplitude_envelope[0] ?? [];
    const buckets = bucketizeAmplitude(firstChannel, WAVEFORM_BUCKET_COUNT);
    return {
      version: 1,
      bucketCount: buckets.length,
      buckets,
    };
  }

  throw new Error("Unrecognized waveform payload");
}

/**
 * Get cached waveform JSON data for a waveform name.
 */
export async function getCachedWaveform(
  waveformName: string,
): Promise<TransientWaveformData> {
  const url = getWaveformUrl(waveformName);

  try {
    return await cacheFetch<TransientWaveformData>(url, async (res) =>
      normalizeWaveformData((await res.json()) as WaveformResponse),
    );
  } catch (error) {
    console.error(`Failed to get cached waveform for ${waveformName}`, error);
    throw error;
  }
}

/**
 * Optionally pre-cache waveforms for offline use.
 */
export async function preCacheWaveforms(
  waveformNames: string[],
): Promise<void> {
  await Promise.all(waveformNames.map((name) => getCachedWaveform(name)));
}

/**
 * Remove trailing silence relative to the peak amplitude.
 */
function trimTrailingSilence(
  values: ArrayLike<number>,
  threshold: number = WAVEFORM_SILENCE_THRESHOLD,
): number[] {
  const length = values.length;
  if (length === 0) return [];

  let peak = 0;
  for (let i = 0; i < length; i++) {
    const magnitude = Math.abs(values[i]);
    if (magnitude > peak) peak = magnitude;
  }

  if (peak === 0) return [];

  const cutoff = peak * threshold;
  let lastIndex = -1;
  for (let i = length - 1; i >= 0; i--) {
    if (Math.abs(values[i]) >= cutoff) {
      lastIndex = i;
      break;
    }
  }

  if (lastIndex < 0) {
    return [];
  }

  return Array.from(values).slice(0, lastIndex + 1);
}

/**
 * Down-sample an array of amplitude values into fixed-size buckets.
 *
 * - Accepts raw magnitudes (any scale).
 * - Normalizes to the peak value.
 * - Trims trailing silence before bucketing.
 * - Returns 0..WAVEFORM_VALUE_SCALE integers for compact JSON storage.
 */
export function bucketizeAmplitude(
  values: ArrayLike<number>,
  bucketCount: number = WAVEFORM_BUCKET_COUNT,
  silenceThreshold: number = WAVEFORM_SILENCE_THRESHOLD,
): number[] {
  const trimmed = trimTrailingSilence(values, silenceThreshold);
  const totalValues = trimmed.length;
  const safeBucketCount = Math.max(1, bucketCount);

  if (totalValues === 0) {
    return Array(safeBucketCount).fill(0);
  }

  let peak = 0;
  for (let i = 0; i < totalValues; i++) {
    const magnitude = Math.abs(trimmed[i]);
    if (magnitude > peak) peak = magnitude;
  }

  if (peak === 0) {
    return Array(safeBucketCount).fill(0);
  }

  const buckets: number[] = [];
  const bucketSize = totalValues / safeBucketCount;

  for (let bucketIndex = 0; bucketIndex < safeBucketCount; bucketIndex++) {
    const start = Math.floor(bucketIndex * bucketSize);
    const end = Math.min(
      totalValues,
      Math.floor((bucketIndex + 1) * bucketSize),
    );

    let bucketPeak = 0;
    for (let i = start; i < end; i++) {
      const normalized = Math.abs(trimmed[i]) / peak;
      if (normalized > bucketPeak) {
        bucketPeak = normalized;
      }
    }

    buckets.push(Math.round(bucketPeak * WAVEFORM_VALUE_SCALE));
  }

  return buckets;
}
