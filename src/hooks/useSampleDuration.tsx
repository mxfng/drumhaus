import { useEffect, useState } from "react";

import { getSampleDuration } from "@/lib/audio/engine";

interface UseSampleDurationResult {
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export const useSampleDuration = (url: string): UseSampleDurationResult => {
  const [duration, setDuration] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [trackedUrl, setTrackedUrl] = useState(url);

  // Reset loading state when URL changes during render
  if (trackedUrl !== url) {
    setTrackedUrl(url);
    if (!isLoading) {
      setIsLoading(true);
    }
    if (error !== null) {
      setError(null);
    }
  }

  useEffect(() => {
    let cancelled = false;

    const updateSampleDuration = async () => {
      const result = await getSampleDuration(url);
      if (cancelled) return;

      if (result.success) {
        setDuration(result.duration);
        setError(null);
      } else {
        setDuration(0);
        setError(result.error ?? "Failed to load sample");
      }
      setIsLoading(false);
    };

    updateSampleDuration();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { duration, isLoading, error };
};
