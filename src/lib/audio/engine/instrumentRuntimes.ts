import * as Tone from "tone/build/esm/index";

import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import { getCachedAudioUrl, preCacheAudioFiles } from "./cache";

/**
 * Creates runtime InstrumentRuntime nodes from serializable InstrumentData
 * Only creates Tone.js audio nodes - data should be read from useInstrumentsStore
 *
 * Disposes existing runtimes before creating new ones to prevent memory leaks
 *
 * Pre-caches audio files from external URLs if configured, then creates samplers
 * with cached blob URLs or local URLs.
 */
export async function createInstrumentRuntimes(
  runtimes: React.MutableRefObject<InstrumentRuntime[]>,
  data: InstrumentData[],
): Promise<void> {
  // Dispose existing runtimes before creating new ones
  if (runtimes.current.length > 0) {
    runtimes.current.forEach(disposeInstrumentRuntime);
  }

  // Pre-cache all audio files (this will download external files if configured)
  const samplePaths = data.map((d) => d.sample.path);
  await preCacheAudioFiles(samplePaths);

  // Create instrument runtimes with cached URLs
  runtimes.current = await Promise.all(
    data.map(async (d) => {
      const filterNode = new Tone.Filter(0, "highpass");
      const envelopeNode = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
      const pannerNode = new Tone.Panner(0);

      const samplePath = d.sample.path;
      const instrumentId = d.meta.id;

      // Get cached URL (blob URL for external files, or local URL)
      const audioUrl = await getCachedAudioUrl(samplePath);

      // Extract just the filename for Tone.Sampler
      // If it's a blob URL, we pass the full blob URL directly
      // If it's a local URL like /samples/0/kick.wav, we need to extract the relative path
      let samplerUrl: string;
      let baseUrl: string | undefined;

      if (audioUrl.startsWith("blob:")) {
        // For blob URLs, use the full URL as the path and no baseUrl
        samplerUrl = audioUrl;
        baseUrl = undefined;
      } else if (audioUrl.startsWith("/")) {
        // For local URLs, extract the relative path from /samples/
        samplerUrl = samplePath; // Use the original sample path
        baseUrl = "/samples/";
      } else {
        // For external URLs (shouldn't happen with our current implementation, but handle it)
        samplerUrl = samplePath;
        baseUrl = undefined;
      }

      const samplerNode = new Tone.Sampler({
        urls: {
          ["C2"]: samplerUrl,
        },
        ...(baseUrl && { baseUrl }),
      });

      return {
        instrumentId,
        samplerNode,
        envelopeNode,
        filterNode,
        pannerNode,
      };
    }),
  );
}

/**
 * Disposes all nodes in an instrument runtime
 */
function disposeInstrumentRuntime(runtime: InstrumentRuntime): void {
  runtime.samplerNode.dispose();
  runtime.envelopeNode.dispose();
  runtime.filterNode.dispose();
  runtime.pannerNode.dispose();
}

/**
 * Disposes all instrument runtimes and clears the ref
 */
export function disposeInstrumentRuntimes(
  runtimes: React.MutableRefObject<InstrumentRuntime[]>,
): void {
  if (runtimes.current) {
    runtimes.current.forEach(disposeInstrumentRuntime);
    runtimes.current = [];
  }
}
