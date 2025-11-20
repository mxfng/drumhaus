import { Buffer } from "tone/build/esm/index";

import { getCachedAudioUrl } from "../cache";

/**
 * Fetches an audio buffer from a URL and returns its duration in seconds.
 */
export async function getSampleDuration(samplePath: string): Promise<number> {
  try {
    // Get cached URL (blob URL for external files, or local URL)
    const cachedUrl = await getCachedAudioUrl(samplePath);
    const buffer = await Buffer.fromUrl(cachedUrl);
    return buffer.duration;
  } catch (error) {
    console.error("Error fetching or decoding audio data:", error);
    return 0;
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
