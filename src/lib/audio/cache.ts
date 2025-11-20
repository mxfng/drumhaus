/**
 * Audio & Waveform Cache Utility
 *
 * - Caches local audio files from /samples/ via Cache API.
 * - Caches waveform JSON files from /waveforms/ via Cache API.
 * - Returns blob URLs for cached samples and JSON for waveforms.
 * - Works offline after first download and persists across page refreshes.
 */

const CACHE_NAME = "drumhaus-audio-cache-v1";
const AUDIO_PREFIX = "/samples/";
const WAVEFORM_PREFIX = "/waveforms/";

const blobUrlBySamplePath = new Map<string, string>(); // samplePath -> blob: URL
const inFlightResponses = new Map<string, Promise<Response>>(); // url -> response promise

const hasCacheAPI = (): boolean =>
  typeof window !== "undefined" && "caches" in window;

/**
 * Open the named Cache API store (null when unavailable or disallowed).
 */
async function getCacheStore(): Promise<Cache | null> {
  if (!hasCacheAPI()) {
    return null;
  }
  try {
    return await caches.open(CACHE_NAME);
  } catch (error) {
    console.warn("Cache API unavailable, falling back to direct fetch", error);
    return null;
  }
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
  const cache = await getCacheStore();
  const request = new Request(url);

  const fetchOnce = (): Promise<Response> => {
    const existing = inFlightResponses.get(url);
    if (existing) return existing.then((res) => res.clone());

    const pending = (async () => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch: ${url} (${res.status})`);
      }
      return res;
    })();

    inFlightResponses.set(url, pending);
    return pending.finally(() => {
      inFlightResponses.delete(url);
    });
  };

  // Prefer Cache API if available, but fall back to direct fetch when running
  // in environments without it (older browsers, etc).
  if (cache) {
    const cached = await cache.match(request);
    if (cached) {
      return parse(cached);
    }

    const response = await fetchOnce();
    await cache.put(request, response.clone());

    return parse(response);
  }

  const response = await fetchOnce();

  return parse(response);
}

/**
 * URL helpers for local assets.
 */
function getLocalAudioUrl(samplePath: string): string {
  return `${AUDIO_PREFIX}${samplePath}`;
}

function getWaveformUrl(waveformName: string): string {
  return `${WAVEFORM_PREFIX}${waveformName}.json`;
}

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

// --- Waveform Data ---

export interface WaveformData {
  amplitude_envelope: number[][];
}

/**
 * Get cached waveform JSON data for a waveform name.
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
 * Pre-cache multiple audio files
 */
export async function preCacheAudioFiles(samplePaths: string[]): Promise<void> {
  await Promise.all(samplePaths.map((path) => getCachedAudioUrl(path)));
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
