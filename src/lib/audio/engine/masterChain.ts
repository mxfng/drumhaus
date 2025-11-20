import * as Tone from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/Knob";
import type { InstrumentRuntime } from "@/types/instrument";

export interface MasterChainRuntimes {
  lowPassFilter: Tone.Filter;
  highPassFilter: Tone.Filter;
  phaser: Tone.Phaser;
  reverb: Tone.Reverb;
  compressor: Tone.Compressor;
}

export interface MasterChainParams {
  lowPass: number;
  hiPass: number;
  phaser: number;
  reverb: number;
  compThreshold: number;
  compRatio: number;
  masterVolume: number;
}

/**
 * Creates and initializes all master chain audio runtimes
 * Disposes existing runtimes before creating new ones to prevent memory leaks
 */
export async function createMasterChainRuntimes(
  runtimes: React.MutableRefObject<MasterChainRuntimes | null>,
  params: MasterChainParams,
): Promise<void> {
  // Dispose existing runtimes before creating new ones
  if (runtimes.current) {
    runtimes.current.lowPassFilter.dispose();
    runtimes.current.highPassFilter.dispose();
    runtimes.current.phaser.dispose();
    runtimes.current.reverb.dispose();
    runtimes.current.compressor.dispose();
  }

  const lowPassFreq = transformKnobValueExponential(params.lowPass, [0, 15000]);
  const hiPassFreq = transformKnobValueExponential(params.hiPass, [0, 15000]);
  const phaserWet = transformKnobValue(params.phaser, [0, 1]);
  const reverbWet = transformKnobValue(params.reverb, [0, 0.5]);
  const reverbDecay = transformKnobValue(params.reverb, [0.1, 3]);
  const compThreshold = transformKnobValue(params.compThreshold, [-40, 0]);
  const compRatio = Math.floor(transformKnobValue(params.compRatio, [1, 8]));

  const lowPassFilter = new Tone.Filter(lowPassFreq, "lowpass");
  const highPassFilter = new Tone.Filter(hiPassFreq, "highpass");
  const phaser = new Tone.Phaser({
    frequency: 1,
    octaves: 3,
    baseFrequency: 1000,
    wet: phaserWet,
  });

  // Reverb needs async initialization
  const reverb = new Tone.Reverb({
    decay: reverbDecay,
    wet: reverbWet,
  });
  await reverb.generate();

  const compressor = new Tone.Compressor({
    threshold: compThreshold,
    ratio: compRatio,
    attack: 0.5,
    release: 1,
  });

  Tone.Destination.volume.value = transformKnobValue(
    params.masterVolume,
    [-46, 4],
  );

  runtimes.current = {
    lowPassFilter,
    highPassFilter,
    phaser,
    reverb,
    compressor,
  };
}

/**
 * Connects all instrument runtimes to the master chain
 */
export function connectInstrumentsToMasterChain(
  instrumentRuntimes: InstrumentRuntime[],
  masterChainRuntimes: MasterChainRuntimes,
): void {
  instrumentRuntimes.forEach((inst) => {
    // Disconnect existing links to avoid duplicated chains when re-connecting
    inst.samplerNode.disconnect();
    inst.envelopeNode.disconnect();
    inst.filterNode.disconnect();
    inst.pannerNode.disconnect();

    inst.samplerNode.chain(
      inst.envelopeNode,
      inst.filterNode,
      inst.pannerNode,
      masterChainRuntimes.lowPassFilter,
      masterChainRuntimes.highPassFilter,
      masterChainRuntimes.phaser,
      masterChainRuntimes.reverb,
      masterChainRuntimes.compressor,
      Tone.Destination,
    );
  });
}

/**
 * Updates master chain parameter values on existing runtimes
 */
export function updateMasterChainParams(
  runtimes: MasterChainRuntimes,
  params: MasterChainParams,
): void {
  // Low pass filter
  runtimes.lowPassFilter.frequency.value = transformKnobValueExponential(
    params.lowPass,
    [0, 15000],
  );

  // High pass filter
  runtimes.highPassFilter.frequency.value = transformKnobValueExponential(
    params.hiPass,
    [0, 15000],
  );

  // Phaser
  runtimes.phaser.wet.value = transformKnobValue(params.phaser, [0, 1]);

  // Reverb
  runtimes.reverb.wet.value = transformKnobValue(params.reverb, [0, 0.5]);
  runtimes.reverb.decay = transformKnobValue(params.reverb, [0.1, 3]);

  // Compressor
  runtimes.compressor.threshold.value = transformKnobValue(
    params.compThreshold,
    [-40, 0],
  );
  runtimes.compressor.ratio.value = Math.floor(
    transformKnobValue(params.compRatio, [1, 8]),
  );

  // Master volume (Tone.Destination)
  Tone.Destination.volume.value = transformKnobValue(
    params.masterVolume,
    [-46, 4],
  );
}

/**
 * Disposes all master chain runtimes and clears the ref
 */
export function disposeMasterChainRuntimes(
  runtimes: React.MutableRefObject<MasterChainRuntimes | null>,
): void {
  if (runtimes.current) {
    runtimes.current.lowPassFilter.dispose();
    runtimes.current.highPassFilter.dispose();
    runtimes.current.phaser.dispose();
    runtimes.current.reverb.dispose();
    runtimes.current.compressor.dispose();
    runtimes.current = null;
  }
}
