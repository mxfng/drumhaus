import * as Tone from "tone/build/esm/index";

/**
 * Fetches an audio buffer from a URL and returns its duration in seconds.
 * @param url - The URL path to the audio sample (relative to /samples/)
 * @returns The duration of the audio sample in seconds, or 0 if an error occurs
 */
export async function getSampleDuration(url: string): Promise<number> {
  try {
    const buffer = await Tone.Buffer.fromUrl(`/samples/${url}`);
    return buffer.duration;
  } catch (error) {
    console.error("Error fetching or decoding audio data:", error);
    return 0;
  }
}

/**
 * Waits for all Tone.js audio buffers to load.
 * This should be called after creating instrument runtimes to ensure
 * all sampler buffers are ready before playback.
 * @returns Promise that resolves when all buffers are loaded
 * @throws Error if loading fails
 */
export async function waitForBuffersToLoad(): Promise<void> {
  await Tone.loaded();
}
