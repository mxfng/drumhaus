import * as Tone from "tone/build/esm/index";

import * as kits from "@/lib/kits";
import { Instrument, InstrumentData } from "@/types/types";

/**
 * Creates runtime Instrument objects from serializable InstrumentData
 * Combines instrument data with Tone.js audio nodes
 */
export const createInstruments = (data: InstrumentData[]): Instrument[] => {
  return data.map((d) => {
    const filterNode = new Tone.Filter(0, "highpass");
    const envelopeNode = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
    const pannerNode = new Tone.Panner(0);

    const samplerNode = new Tone.Sampler({
      urls: {
        ["C2"]: d.url,
      },
      baseUrl: "/samples/",
    });

    return {
      ...d,
      samplerNode,
      envelopeNode,
      filterNode,
      pannerNode,
    };
  });
};

// Create initial Drumhaus sampler objects
export const INIT_INSTRUMENTS: Instrument[] = createInstruments(
  kits.drumhaus().instruments,
);
