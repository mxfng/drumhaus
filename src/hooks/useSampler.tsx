import { Samples } from "@/types/types";
import { useEffect, useState } from "react";
import * as Tone from "tone/build/esm/index";

export const useSampler = (samples: Samples) => {
  const [sampler, setSampler] = useState<Tone.Sampler | null>(null);

  useEffect(() => {
    const newSampler = new Tone.Sampler({
      urls: samples.reduce((acc: Record<string, string>, sample) => {
        acc[sample.mapToSampler] = sample.url;
        return acc;
      }, {}),
      baseUrl: "/samples/",
      onload: () => {
        console.log("Sampler loaded successfully");
      },
    });

    setSampler(newSampler);

    return () => {
      newSampler.dispose();
    };
  }, [samples]);

  return { sampler };
};
