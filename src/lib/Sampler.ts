import * as Tone from "tone/build/esm/index";

// One sample per sampler, one sampler per slot
export const Sampler = (sampleUrl: string): Tone.Sampler => {
  return new Tone.Sampler({
    urls: {
      ["C2"]: sampleUrl, // All samples assigned C2 root note
    },
    baseUrl: "/samples/",
    onload: () => {
      console.log(`Sampler loaded ${sampleUrl} successfully`);
    },
  }).toDestination();
};
