/**
 * Audio Cache Utility
 *
 * - Caches local audio files from /samples/ via Cache API.
 * - Returns blob URLs for cached samples so they persist across page refreshes.
 * - Works offline after first download.
 */

const CACHE_NAME = "drumhaus-audio-cache-v1";
const BLOB_URL_MAP = new Map<string, string>(); // samplePath -> blob: URL

function getLocalUrl(samplePath: string): string {
  return `/samples/${samplePath}`;
}

async function openCache(): Promise<Cache> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache API is not available in this environment");
  }
  return caches.open(CACHE_NAME);
}

function setBlobUrl(samplePath: string, blobUrl: string): void {
  const prev = BLOB_URL_MAP.get(samplePath);
  if (prev && prev.startsWith("blob:")) {
    URL.revokeObjectURL(prev);
  }
  BLOB_URL_MAP.set(samplePath, blobUrl);
}

/**
 * Core: get a Blob from Cache API or fetch from local server.
 * - If cached: use that (works offline)
 * - If not cached: fetch from /samples/, store in cache
 */
async function getOrCacheLocalBlob(samplePath: string): Promise<Blob> {
  const cache = await openCache();
  const localUrl = getLocalUrl(samplePath);
  // Use the actual URL as the cache key (Cache API requires valid http/https URLs)
  const cacheRequest = new Request(localUrl);

  // 1. Try cache first (offline path)
  let response = await cache.match(cacheRequest);
  if (!response) {
    // 2. Not cached: fetch from local server
    response = await fetch(localUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch audio file: ${localUrl} (${response.status})`,
      );
    }
    // Clone before consuming blob
    const responseClone = response.clone();
    // Cache the response using the actual URL as the key
    await cache.put(cacheRequest, responseClone);
    // Use original response for blob extraction
  }

  return response.blob();
}

/**
 * Get a playable blob URL for a sample path.
 * - Caches local files from /samples/ in Cache API
 * - Returns blob: URLs that persist across page refreshes
 * - Works offline after first download
 */
export async function getCachedAudioUrl(samplePath: string): Promise<string> {
  // In-memory fast path
  if (BLOB_URL_MAP.has(samplePath)) {
    return BLOB_URL_MAP.get(samplePath)!;
  }

  // Get blob from cache or fetch and cache
  try {
    const blob = await getOrCacheLocalBlob(samplePath);
    const blobUrl = URL.createObjectURL(blob);
    setBlobUrl(samplePath, blobUrl);
    return blobUrl;
  } catch (error) {
    console.error(`Failed to get cached audio for ${samplePath}`, error);
    // Fallback to direct URL (no offline guarantee)
    const localUrl = getLocalUrl(samplePath);
    setBlobUrl(samplePath, localUrl);
    return localUrl;
  }
}

/**
 * Pre-cache multiple audio files (typically call this while online after kit load).
 */
export async function preCacheAudioFiles(samplePaths: string[]): Promise<void> {
  await Promise.all(samplePaths.map((path) => getCachedAudioUrl(path)));
}

/**
 * Clears the audio cache (both in-memory blob URLs and Cache API storage)
 */
export async function clearAudioCache(): Promise<void> {
  // Revoke all blob URLs
  for (const blobUrl of Array.from(BLOB_URL_MAP.values())) {
    if (blobUrl.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrl);
    }
  }
  BLOB_URL_MAP.clear();

  // Clear Cache API
  if (typeof window !== "undefined" && "caches" in window) {
    try {
      await caches.delete(CACHE_NAME);
    } catch (error) {
      console.error("Error clearing audio cache:", error);
    }
  }
}
