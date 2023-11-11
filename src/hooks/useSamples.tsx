import { Samples } from "@/types/types";
import { useState } from "react";

export const useSamples = () => {
  const [samples, setSamples] = useState<Samples>([
    { id: "kick1", url: "909_kick.wav", mapToSampler: "D0" },
    { id: "kick2", url: "909_kick.wav", mapToSampler: "D1" },
    { id: "snare", url: "909_kick.wav", mapToSampler: "D2" },
    { id: "clap", url: "909_kick.wav", mapToSampler: "D3" },
    { id: "closedHiHat", url: "909_kick.wav", mapToSampler: "D4" },
    { id: "openHiHat", url: "909_kick.wav", mapToSampler: "D5" },
    { id: "flex1", url: "909_kick.wav", mapToSampler: "D6" },
    { id: "flex2", url: "909_kick.wav", mapToSampler: "D7" },
  ]);

  return { samples, setSamples };
};
