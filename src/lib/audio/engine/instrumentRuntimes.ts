import * as Tone from "tone/build/esm/index";

import * as kits from "@/lib/kit";
import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";

/**
 * Creates runtime InstrumentRuntime nodes from serializable InstrumentData
 * Only creates Tone.js audio nodes - data should be read from useInstrumentsStore
 *
 * Disposes existing runtimes before creating new ones to prevent memory leaks
 */
export function createInstrumentRuntimes(
  runtimes: React.MutableRefObject<InstrumentRuntime[]>,
  data: InstrumentData[],
): void {
  // Dispose existing runtimes before creating new ones
  if (runtimes.current.length > 0) {
    runtimes.current.forEach(disposeInstrumentRuntime);
  }

  runtimes.current = data.map((d) => {
    const filterNode = new Tone.Filter(0, "highpass");
    const envelopeNode = new Tone.AmplitudeEnvelope(0, 0, 1, 0.05);
    const pannerNode = new Tone.Panner(0);

    const samplePath = d.sample.path;
    const instrumentId = d.meta.id;

    const samplerNode = new Tone.Sampler({
      urls: {
        ["C2"]: samplePath,
      },
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
}

/**
 * Disposes all nodes in an instrument runtime
 */
function disposeInstrumentRuntime(runtime: InstrumentRuntime): void {
  runtime.samplerNode.dispose();
  runtime.envelopeNode.dispose();
  runtime.filterNode.dispose();
  runtime.pannerNode.dispose();
}

/**
 * Disposes all instrument runtimes and clears the ref
 */
export function disposeInstrumentRuntimes(
  runtimes: React.MutableRefObject<InstrumentRuntime[]>,
): void {
  if (runtimes.current) {
    runtimes.current.forEach(disposeInstrumentRuntime);
    runtimes.current = [];
  }
}
