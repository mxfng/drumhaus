import * as Tone from "tone/build/esm/index";

import * as kits from "@/lib/kits";
import { Instrument, InstrumentData } from "@/types/types";

/**
 * Creates runtime Instrument objects from serializable InstrumentData
 * Combines instrument data with Tone.js audio nodes
 */
export const createInstruments = (
  instrumentData: InstrumentData[],
): Instrument[] => {
  return instrumentData.map((data) => {
    const filterNode = new Tone.Filter(0, "highpass");
    const envelopeNode = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
    const pannerNode = new Tone.Panner(0);

    const samplerNode = new Tone.Sampler({
      urls: {
        ["C2"]: data.url,
      },
      baseUrl: "/samples/",
    });

    return {
      ...data,
      samplerNode,
      envelopeNode,
      filterNode,
      pannerNode,
    };
  });
};

// Create initial Drumhaus sampler objects
export const _samples: Instrument[] = createInstruments(
  kits.drumhaus().instruments,
);
