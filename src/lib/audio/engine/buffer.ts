import { Buffer } from "tone/build/esm/index";

import { getCachedAudioUrl } from "../cache";

export interface SampleDurationResult {
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Fetches an audio buffer from a URL and returns its duration in seconds.
 * Returns a result object to distinguish between errors and zero-length audio.
 */
export async function getSampleDuration(
  samplePath: string,
): Promise<SampleDurationResult> {
  try {
    // Get cached URL (blob URL for external files, or local URL)
    const cachedUrl = await getCachedAudioUrl(samplePath);
    const buffer = await Buffer.fromUrl(cachedUrl);
    return { success: true, duration: buffer.duration };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching or decoding audio data:", error);
    return { success: false, duration: 0, error: errorMessage };
  }
}

/**
 * Waits for all Tone.js audio buffers to load.
 *
 * This should be called after creating instrument runtimes to ensure
 * all sampler buffers are ready before playback.
 */
export async function waitForBuffersToLoad(): Promise<void> {
  await Buffer.loaded();
}
