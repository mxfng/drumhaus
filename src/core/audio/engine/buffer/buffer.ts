import { ToneAudioBuffer } from "tone/build/esm/index";

/**
 * Waits for all Tone.js audio buffers to load.
 *
 * This should be called after creating instrument runtimes to ensure
 * all sampler buffers are ready before playback.
 */
export async function awaitBufferLoaded(): Promise<void> {
  await ToneAudioBuffer.loaded();
}
