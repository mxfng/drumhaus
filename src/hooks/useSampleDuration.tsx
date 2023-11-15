import { useEffect, useState } from "react";
import * as Tone from "tone/build/esm/index";

export const useSampleDuration = (sampler: Tone.Sampler, url: string) => {
  const [sampleDuration, setSampleDuration] = useState<number>(0);

  useEffect(() => {
    const fetchSampleDuration = async () => {
      try {
        const buffer = await Tone.Buffer.fromUrl(`/samples/${url}`);
        const durationInSeconds = buffer.duration;
        return durationInSeconds;
      } catch (error) {
        console.error("Error fetching or decoding audio data:", error);
        return 0;
      }
    };

    const updateSampleDuration = async () => {
      const duration = await fetchSampleDuration();
      setSampleDuration(duration);
    };

    updateSampleDuration();
  }, [sampler, url]);

  return sampleDuration;
};
