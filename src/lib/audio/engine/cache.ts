/**
 * Audio & Waveform Cache Utility
 *
 * - Caches local audio files from /samples/ via Cache API.
 * - Caches waveform JSON files from /waveforms/ via Cache API.
 * - Returns blob URLs for cached samples and JSON for waveforms.
 * - Works offline after first download and persists across page refreshes.
 */

const CACHE_NAME = "drumhaus-audio-cache-v1";
const BLOB_URL_MAP = new Map<string, string>(); // samplePath -> blob: URL

/**
 * Open the named Cache API store.
 */
async function openCache(): Promise<Cache> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache API is not available in this environment");
  }
  return caches.open(CACHE_NAME);
}

/**
 * Generic "cache or fetch" helper.
 *
 * - Uses the URL as the cache key.
 * - On MISS: fetches from network, stores in cache, then parses.
 * - On HIT: returns parsed cached response.
 */
async function cacheFetch<T>(
  url: string,
  parse: (response: Response) => Promise<T>,
): Promise<T> {
  const cache = await openCache();
  const request = new Request(url);

  let response = await cache.match(request);
  if (!response) {
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${url} (${response.status})`);
    }
    await cache.put(request, response.clone());
  }

  return parse(response);
}

/**
 * URL helpers for local assets.
 */
function getLocalAudioUrl(samplePath: string): string {
  return `/samples/${samplePath}`;
}

function getWaveformUrl(waveformName: string): string {
  return `/waveforms/${waveformName}.json`;
}

/**
 * Track and clean up blob URLs.
 */
function setBlobUrl(samplePath: string, blobUrl: string): void {
  const prev = BLOB_URL_MAP.get(samplePath);
  if (prev && prev.startsWith("blob:")) {
    URL.revokeObjectURL(prev);
  }
  BLOB_URL_MAP.set(samplePath, blobUrl);
}

/**
 * Shape of your waveform JSON.
 * Example:
 * { "amplitude_envelope": number[][] }
 */
export interface WaveformData {
  amplitude_envelope: number[][];
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
  if (BLOB_URL_MAP.has(samplePath)) {
    return BLOB_URL_MAP.get(samplePath)!;
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
 * Get cached waveform JSON data for a waveform name.
 *
 * - Caches /waveforms/... JSON responses in Cache API.
 * - Returns parsed JSON data.
 * - Works offline after first download.
 */
export async function getCachedWaveform(
  waveformName: string,
): Promise<WaveformData> {
  const url = getWaveformUrl(waveformName);

  try {
    return await cacheFetch<WaveformData>(url, (res) => res.json());
  } catch (error) {
    console.error(`Failed to get cached waveform for ${waveformName}`, error);
    throw error;
  }
}

/**
 * Pre-cache multiple audio files (typically call this while online after kit load).
 */
export async function preCacheAudioFiles(samplePaths: string[]): Promise<void> {
  await Promise.all(samplePaths.map((path) => getCachedAudioUrl(path)));
}

/**
 * Optionally: pre-cache multiple waveforms.
 * Call this if you want waveform data available offline immediately.
 */
export async function preCacheWaveforms(
  waveformNames: string[],
): Promise<void> {
  await Promise.all(waveformNames.map((name) => getCachedWaveform(name)));
}

/**
 * Clears the audio cache (both in-memory blob URLs and Cache API storage).
 * Waveform data lives only in Cache API, so deleting the cache clears both.
 */
export async function clearAudioCache(): Promise<void> {
  // Revoke all blob URLs
  for (const blobUrl of BLOB_URL_MAP.values()) {
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
