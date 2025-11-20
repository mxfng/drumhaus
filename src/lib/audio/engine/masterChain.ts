import type { MutableRefObject } from "react";
import * as Tone from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/Knob";
import type { InstrumentRuntime } from "@/types/instrument";
import {
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_REVERB_WET_RANGE,
  MASTER_VOLUME_RANGE,
} from "./constants";

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
  runtimes: MutableRefObject<MasterChainRuntimes | null>,
  params: MasterChainParams,
): Promise<void> {
  disposeMasterChainRuntimes(runtimes);

  runtimes.current = await buildMasterChain(params);
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
    MASTER_FILTER_RANGE,
  );

  // High pass filter
  runtimes.highPassFilter.frequency.value = transformKnobValueExponential(
    params.hiPass,
    MASTER_FILTER_RANGE,
  );

  // Phaser
  runtimes.phaser.wet.value = transformKnobValue(
    params.phaser,
    MASTER_PHASER_WET_RANGE,
  );

  // Reverb
  runtimes.reverb.wet.value = transformKnobValue(
    params.reverb,
    MASTER_REVERB_WET_RANGE,
  );
  runtimes.reverb.decay = transformKnobValue(
    params.reverb,
    MASTER_REVERB_DECAY_RANGE,
  );

  // Compressor
  runtimes.compressor.threshold.value = transformKnobValue(
    params.compThreshold,
    MASTER_COMP_THRESHOLD_RANGE,
  );
  runtimes.compressor.ratio.value = Math.floor(
    transformKnobValue(params.compRatio, MASTER_COMP_RATIO_RANGE),
  );

  // Master volume (Tone.Destination)
  Tone.Destination.volume.value = transformKnobValue(
    params.masterVolume,
    MASTER_VOLUME_RANGE,
  );
}

/**
 * Disposes all master chain runtimes and clears the ref
 */
export function disposeMasterChainRuntimes(
  runtimes: MutableRefObject<MasterChainRuntimes | null>,
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

async function buildMasterChain(
  params: MasterChainParams,
): Promise<MasterChainRuntimes> {
  const lowPassFreq = transformKnobValueExponential(
    params.lowPass,
    MASTER_FILTER_RANGE,
  );
  const highPassFreq = transformKnobValueExponential(
    params.hiPass,
    MASTER_FILTER_RANGE,
  );
  const phaserWet = transformKnobValue(params.phaser, MASTER_PHASER_WET_RANGE);
  const reverbWet = transformKnobValue(params.reverb, MASTER_REVERB_WET_RANGE);
  const reverbDecay = transformKnobValue(
    params.reverb,
    MASTER_REVERB_DECAY_RANGE,
  );
  const compThreshold = transformKnobValue(
    params.compThreshold,
    MASTER_COMP_THRESHOLD_RANGE,
  );
  const compRatio = Math.floor(
    transformKnobValue(params.compRatio, MASTER_COMP_RATIO_RANGE),
  );

  const lowPassFilter = new Tone.Filter(lowPassFreq, "lowpass");
  const highPassFilter = new Tone.Filter(highPassFreq, "highpass");
  const phaser = new Tone.Phaser({
    frequency: 1,
    octaves: 3,
    baseFrequency: 1000,
    wet: phaserWet,
  });

  const reverb = new Tone.Reverb({
    decay: reverbDecay,
    wet: reverbWet,
  });
  await reverb.generate(); // Required before first use

  const compressor = new Tone.Compressor({
    threshold: compThreshold,
    ratio: compRatio,
    attack: 0.5,
    release: 1,
  });

  Tone.Destination.volume.value = transformKnobValue(
    params.masterVolume,
    MASTER_VOLUME_RANGE,
  );

  return {
    lowPassFilter,
    highPassFilter,
    phaser,
    reverb,
    compressor,
  };
}
