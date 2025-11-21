import { useEffect, useState } from "react";

import { getSampleDuration } from "@/lib/audio/engine";

export const useSampleDuration = (url: string) => {
  const [sampleDuration, setSampleDuration] = useState<number>(0);

  useEffect(() => {
    const updateSampleDuration = async () => {
      const result = await getSampleDuration(url);
      setSampleDuration(result.duration);
    };

    updateSampleDuration();
  }, [url]);

  return sampleDuration;
};
