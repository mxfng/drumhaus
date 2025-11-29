import { CACHE_NAME, cacheFetch, hasCacheAPI } from "./common";

const AUDIO_PREFIX = "/samples/";

const blobUrlBySamplePath = new Map<string, string>(); // samplePath -> blob: URL

/**
 * Track and clean up blob URLs.
 */
function setBlobUrl(samplePath: string, blobUrl: string): void {
  const prev = blobUrlBySamplePath.get(samplePath);
  if (prev && prev.startsWith("blob:")) {
    URL.revokeObjectURL(prev);
  }
  blobUrlBySamplePath.set(samplePath, blobUrl);
}

/**
 * URL helper for local audio assets.
 */
function getLocalAudioUrl(samplePath: string): string {
  return `${AUDIO_PREFIX}${samplePath}`;
}

/**
 * Get a playable blob URL for a sample path.
 *
 * - Caches /samples/... responses in Cache API.
 * - Returns blob: URLs that persist across page refreshes.
 * - Works offline after first download (as long as the app shell is loaded).
 */
export async function getCachedAudioUrl(samplePath: string): Promise<string> {
  // In-memory fast path
  if (blobUrlBySamplePath.has(samplePath)) {
    return blobUrlBySamplePath.get(samplePath)!;
  }

  const url = getLocalAudioUrl(samplePath);

  try {
    const blob = await cacheFetch(url, (res) => res.blob());
    const blobUrl = URL.createObjectURL(blob);
    setBlobUrl(samplePath, blobUrl);
    return blobUrl;
  } catch (error) {
    console.error(`Failed to get cached audio for ${samplePath}`, error);
    // Fallback to direct URL (no offline guarantee)
    setBlobUrl(samplePath, url);
    return url;
  }
}

/**
 * Pre-cache multiple audio files
 */
export async function preCacheAudioFiles(samplePaths: string[]): Promise<void> {
  await Promise.all(samplePaths.map((path) => getCachedAudioUrl(path)));
}

/**
 * Clears in-memory blob URLs and Cache API storage.
 */
export async function clearAudioCache(): Promise<void> {
  for (const blobUrl of blobUrlBySamplePath.values()) {
    if (blobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }
  }
  blobUrlBySamplePath.clear();

  if (hasCacheAPI()) {
    try {
      await caches.delete(CACHE_NAME);
    } catch (error) {
      console.error("Error clearing audio cache:", error);
    }
  }
}
