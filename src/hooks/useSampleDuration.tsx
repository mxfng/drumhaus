import { useEffect, useState } from "react";

import type { InstrumentRuntime } from "@/types/instrument";

/**
 * Gets the sample duration from an already-loaded Sampler runtime
 * instead of loading the buffer separately.
 * Accesses the internal _buffers property to get duration.
 */
export const useSampleDuration = (runtime: InstrumentRuntime) => {
  const [sampleDuration, setSampleDuration] = useState<number>(0);

  useEffect(() => {
    const checkDuration = () => {
      if (runtime.samplerNode.loaded) {
        try {
          // Access the internal _buffers property (private but accessible in JS)
          const buffers = (runtime.samplerNode as any)._buffers;
          if (buffers && buffers._buffers) {
            // Get all buffers and find the first one
            const bufferMap = buffers._buffers;
            // Buffers are stored by URL, get the first one
            for (const key in bufferMap) {
              const buffer = bufferMap[key];
              if (buffer && buffer.duration) {
                setSampleDuration(buffer.duration);
                return;
              }
            }
          }
        } catch (error) {
          // Silently fail and retry
          console.debug("Buffer not ready yet, retrying...");
        }
      }
      // If buffer not loaded yet, try again in 100ms
      const timer = setTimeout(checkDuration, 100);
      return () => clearTimeout(timer);
    };

    checkDuration();
  }, [runtime]);

  return sampleDuration;
};
