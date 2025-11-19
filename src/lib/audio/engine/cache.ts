/**
 * Audio Cache Utility (lean version)
 *
 * - Downloads external audio files and caches them via Cache API.
 * - Returns blob URLs for external samples, plain URLs for local ones.
 * - Cache persists across page refreshes and works offline (after first download).
 */

const CACHE_NAME = "drumhaus-audio-cache-v1";
const CACHE_KEY_PREFIX = "drumhaus-sample:";
const BLOB_URL_MAP = new Map<string, string>(); // samplePath -> URL (blob: or /samples/...)

/**
 * Configuration for external audio URLs.
 * Maps sample paths (e.g., "0/kick.wav") to external URLs.
 * If a path is not in this map, it will use the local /samples/ path.
 */
export interface ExternalAudioConfig {
  baseUrl?: string; // e.g. "https://cdn.example.com/samples"
  pathMap?: Record<string, string>; // samplePath -> full external URL
}

let externalConfig: ExternalAudioConfig | null = null;

export function setExternalAudioConfig(
  config: ExternalAudioConfig | null,
): void {
  externalConfig = config;
}

function getExternalUrl(samplePath: string): string | null {
  if (!externalConfig) return null;

  if (externalConfig.pathMap && externalConfig.pathMap[samplePath]) {
    return externalConfig.pathMap[samplePath];
  }

  if (externalConfig.baseUrl) {
    return `${externalConfig.baseUrl}/${samplePath}`;
  }

  return null;
}

function getLocalUrl(samplePath: string): string {
  return `/samples/${samplePath}`;
}

function getCacheKey(samplePath: string): string {
  return `${CACHE_KEY_PREFIX}${samplePath}`;
}

async function openCache(): Promise<Cache> {
  if (typeof window === "undefined" || !("caches" in window)) {
    throw new Error("Cache API is not available in this environment");
  }
  return caches.open(CACHE_NAME);
}

type ResolvedSample = {
  samplePath: string;
  url: string;
  cacheable: boolean; // external files only
};

function resolveSample(samplePath: string): ResolvedSample {
  const externalUrl = getExternalUrl(samplePath);
  if (externalUrl) {
    return { samplePath, url: externalUrl, cacheable: true };
  }
  return { samplePath, url: getLocalUrl(samplePath), cacheable: false };
}

function setBlobUrl(samplePath: string, url: string): void {
  const prev = BLOB_URL_MAP.get(samplePath);
  if (prev && prev.startsWith("blob:")) {
    URL.revokeObjectURL(prev);
  }
  BLOB_URL_MAP.set(samplePath, url);
}

/**
 * Core: given a resolved external sample, get a Blob from Cache API or network.
 * - If cached: use that (works offline)
 * - If not cached: fetch from network, store in cache
 */
async function getOrCacheExternalBlob(resolved: ResolvedSample): Promise<Blob> {
  const { samplePath, url } = resolved;
  const cache = await openCache();
  const cacheKey = getCacheKey(samplePath);
  const cacheRequest = new Request(cacheKey);

  // 1. Try cache first (offline path)
  let response = await cache.match(cacheRequest);
  if (!response) {
    // 2. Not cached: fetch from network (requires online)
    response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download audio file: ${url} (${response.status})`,
      );
    }
    // Cache a clone under our cache key (keyed by samplePath, not URL)
    await cache.put(cacheRequest, response.clone());
  }

  return response.blob();
}

/**
 * Get a playable URL for a sample path.
 * - For external samples: returns a blob: URL backed by Cache API.
 * - For local samples: returns `/samples/...` directly.
 * - Persists across reloads: cached Responses are stored in Cache API.
 * - Works offline for external samples that were cached while online.
 */
export async function getCachedAudioUrl(samplePath: string): Promise<string> {
  // In-memory fast path
  if (BLOB_URL_MAP.has(samplePath)) {
    return BLOB_URL_MAP.get(samplePath)!;
  }

  const resolved = resolveSample(samplePath);

  // Local samples: no Cache API needed
  if (!resolved.cacheable) {
    setBlobUrl(samplePath, resolved.url);
    return resolved.url;
  }

  // External + cacheable: use Cache API
  try {
    const blob = await getOrCacheExternalBlob(resolved);
    const blobUrl = URL.createObjectURL(blob);
    setBlobUrl(samplePath, blobUrl);
    return blobUrl;
  } catch (error) {
    console.error(`Failed to get cached audio for ${samplePath}`, error);
    // Last resort: fall back to direct URL (no offline guarantee)
    setBlobUrl(samplePath, resolved.url);
    return resolved.url;
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
