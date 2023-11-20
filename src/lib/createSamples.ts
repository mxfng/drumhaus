import { Sample, SampleData } from "@/types/types";
import * as Tone from "tone/build/esm/index";
import * as kits from "@/lib/kits";

export const createSamples = (samples: SampleData[]) => {
  return samples.map((sample, id) => {
    const filter = new Tone.Filter(0, "highpass");
    const envelope = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
    const panner = new Tone.Panner(0);

    const sampler = new Tone.Sampler({
      urls: {
        ["C2"]: sample.url,
      },
      baseUrl: "/samples/",
    });

    return {
      id: id,
      name: sample.name,
      url: sample.url,
      sampler: sampler,
      envelope: envelope,
      filter: filter,
      panner: panner,
    };
  });
};

// Create initial Drumhaus sampler objects
export const _samples: Sample[] = createSamples(kits.drumhaus().samples);
