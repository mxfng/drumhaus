const CACHE_NAME = "drumhaus-audio-cache-v1";

const inFlightResponses = new Map<string, Promise<Response>>(); // url -> response promise

export const hasCacheAPI = (): boolean =>
  typeof window !== "undefined" && "caches" in window;

/**
 * Open the named Cache API store (null when unavailable or disallowed).
 */
export async function getCacheStore(): Promise<Cache | null> {
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
export async function cacheFetch<T>(
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

export { CACHE_NAME };
