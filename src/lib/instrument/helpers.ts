import * as Tone from "tone/build/esm/index";

import * as kits from "@/lib/kit";
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

    // Defensive: handle both old and new data structures during migration
    const samplePath = d.sample?.path || "";
    const instrumentId =
      d.meta?.id || `inst-${Math.random().toString(36).substr(2, 9)}`;

    const samplerNode = new Tone.Sampler({
      urls: samplePath
        ? {
            ["C2"]: samplePath,
          }
        : {},
      baseUrl: "/samples/",
    });

    return {
      instrumentId,
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
