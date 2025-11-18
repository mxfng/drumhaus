import * as Tone from "tone/build/esm/index";

import * as kits from "@/lib/drumhausKits";
import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";

/**
 * Creates runtime InstrumentRuntime nodes from serializable InstrumentData
 * Only creates Tone.js audio nodes - data should be read from useInstrumentsStore
 */
export const createInstrumentRuntimes = (
  data: InstrumentData[],
): InstrumentRuntime[] => {
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
      samplerNode,
      envelopeNode,
      filterNode,
      pannerNode,
    };
  });
};

// Create initial Drumhaus runtime nodes
export const INIT_INSTRUMENT_RUNTIMES: InstrumentRuntime[] =
  createInstrumentRuntimes(kits.drumhaus().instruments);
