import { getCachedAudioUrl, preCacheAudioFiles } from "./cache";

export type SamplerSource = { url: string; baseUrl?: string };
export type SampleSourceResolver = (
  samplePath: string,
) => Promise<SamplerSource>;

const SAMPLE_BASE_URL = "/samples/";

function toSamplerSource(url: string): SamplerSource {
  // blob: and absolute URLs are ready to use without a baseUrl
  if (
    url.startsWith("blob:") ||
    url.startsWith("http") ||
    url.startsWith("/")
  ) {
    return { url };
  }

  // Relative sample paths need a baseUrl
  return { url, baseUrl: SAMPLE_BASE_URL };
}

/**
 * Prepare a resolver that returns playable sampler sources.
 *
 * - Pre-caches samples (if available).
 * - Returns blob URLs when cached; otherwise falls back to /samples/.
 */
export async function prepareSampleSourceResolver(
  samplePaths: string[],
): Promise<SampleSourceResolver> {
  const uniquePaths = Array.from(new Set(samplePaths));
  const sourceMap = new Map<string, string>();

  try {
    await preCacheAudioFiles(uniquePaths);
  } catch (error) {
    console.warn(
      "Failed to pre-cache audio files, continuing without cache",
      error,
    );
  }

  await Promise.all(
    uniquePaths.map(async (path) => {
      try {
        const url = await getCachedAudioUrl(path);
        sourceMap.set(path, url);
      } catch (error) {
        console.warn(
          `Failed to resolve cached URL for ${path}, using fallback`,
          error,
        );
        sourceMap.set(path, `${SAMPLE_BASE_URL}${path}`);
      }
    }),
  );

  return async (samplePath: string) => {
    const url = sourceMap.get(samplePath) ?? `${SAMPLE_BASE_URL}${samplePath}`;
    return toSamplerSource(url);
  };
}

/**
 * Default resolver without preloading (direct /samples/ path).
 */
export const defaultSampleSourceResolver: SampleSourceResolver = async (
  samplePath: string,
) => toSamplerSource(`${SAMPLE_BASE_URL}${samplePath}`);
