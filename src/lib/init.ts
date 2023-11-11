import { DHSampler } from "@/types/types";
import * as Tone from "tone/build/esm/index";

// __Initialization__
// Define initial sample URLs
const samples: { name: string; url: string }[] = [
  { name: "Kick", url: "909_kick.wav" },
];

// Create initial Drumhaus sampler objects
export const _dhSamplers: DHSampler[] = samples.map((sample) => {
  const test = new Tone.Sampler({
    urls: {
      C2: sample.url,
    },
    baseUrl: "/samples/",
    onload: () => {
      console.log(`DHSampler created for ${sample.name}`);
    },
  }).toDestination();

  return {
    name: sample.name,
    url: sample.url,
    sampler: test,
  };
});

// Create initial arrays of slot parameters
export const _volumes = [0];
export const _solos = [false];
export const _mutes = [false];
