import type { MutableRefObject } from "react";
import * as Tone from "tone/build/esm/index";

import {
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/Knob";
import type { InstrumentRuntime } from "@/types/instrument";
import { MasterChainParams } from "@/types/preset";
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

type MasterChainSettings = {
  lowPassFrequency: number;
  highPassFrequency: number;
  phaserWet: number;
  reverbWet: number;
  reverbDecay: number;
  compThreshold: number;
  compRatio: number;
  masterVolume: number;
};

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
  instrumentRuntimes.forEach((inst) =>
    connectInstrumentRuntime(inst, masterChainRuntimes),
  );
}

/**
 * Updates master chain parameter values on existing runtimes
 *
 */
export function updateMasterChainParams(
  runtimes: MasterChainRuntimes,
  params: MasterChainParams,
): void {
  const settings = mapParamsToSettings(params);
  applySettingsToRuntimes(runtimes, settings);
}

/**
 * Disposes all master chain runtimes and clears the ref.
 * Handles errors gracefully to prevent crashes during cleanup.
 */
export function disposeMasterChainRuntimes(
  runtimes: MutableRefObject<MasterChainRuntimes | null>,
): void {
  if (runtimes.current) {
    const nodesToDispose = [
      { name: "lowPassFilter", node: runtimes.current.lowPassFilter },
      { name: "highPassFilter", node: runtimes.current.highPassFilter },
      { name: "phaser", node: runtimes.current.phaser },
      { name: "reverb", node: runtimes.current.reverb },
      { name: "compressor", node: runtimes.current.compressor },
    ];

    for (const { name, node } of nodesToDispose) {
      try {
        node.dispose();
      } catch (error) {
        console.warn(`Error disposing ${name}:`, error);
      }
    }

    runtimes.current = null;
  }
}

async function buildMasterChain(
  params: MasterChainParams,
): Promise<MasterChainRuntimes> {
  const settings = mapParamsToSettings(params);

  const lowPassFilter = new Tone.Filter(settings.lowPassFrequency, "lowpass");
  const highPassFilter = new Tone.Filter(
    settings.highPassFrequency,
    "highpass",
  );
  const phaser = new Tone.Phaser({
    frequency: 1,
    octaves: 3,
    baseFrequency: 1000,
    wet: settings.phaserWet,
  });

  const reverb = new Tone.Reverb({
    decay: settings.reverbDecay,
    wet: settings.reverbWet,
  });
  await reverb.generate(); // Required before first use

  const compressor = new Tone.Compressor({
    threshold: settings.compThreshold,
    ratio: settings.compRatio,
    attack: 0.5,
    release: 1,
  });

  applySettingsToRuntimes(
    {
      lowPassFilter,
      highPassFilter,
      phaser,
      reverb,
      compressor,
    },
    settings,
  );

  return {
    lowPassFilter,
    highPassFilter,
    phaser,
    reverb,
    compressor,
  };
}

function mapParamsToSettings(params: MasterChainParams): MasterChainSettings {
  return {
    lowPassFrequency: transformKnobValueExponential(
      params.lowPass,
      MASTER_FILTER_RANGE,
    ),
    highPassFrequency: transformKnobValueExponential(
      params.highPass,
      MASTER_FILTER_RANGE,
    ),
    phaserWet: transformKnobValue(params.phaser, MASTER_PHASER_WET_RANGE),
    reverbWet: transformKnobValue(params.reverb, MASTER_REVERB_WET_RANGE),
    reverbDecay: transformKnobValue(params.reverb, MASTER_REVERB_DECAY_RANGE),
    compThreshold: transformKnobValue(
      params.compThreshold,
      MASTER_COMP_THRESHOLD_RANGE,
    ),
    compRatio: Math.floor(
      transformKnobValue(params.compRatio, MASTER_COMP_RATIO_RANGE),
    ),
    masterVolume: transformKnobValue(params.masterVolume, MASTER_VOLUME_RANGE),
  };
}

function applySettingsToRuntimes(
  runtimes: MasterChainRuntimes,
  settings: MasterChainSettings,
): void {
  runtimes.lowPassFilter.frequency.value = settings.lowPassFrequency;
  runtimes.highPassFilter.frequency.value = settings.highPassFrequency;
  runtimes.phaser.wet.value = settings.phaserWet;
  runtimes.reverb.wet.value = settings.reverbWet;
  runtimes.reverb.decay = settings.reverbDecay;
  runtimes.compressor.threshold.value = settings.compThreshold;
  runtimes.compressor.ratio.value = settings.compRatio;
  Tone.Destination.volume.value = settings.masterVolume;
}

function connectInstrumentRuntime(
  instrument: InstrumentRuntime,
  master: MasterChainRuntimes,
): void {
  // Disconnect existing links to avoid duplicated chains when re-connecting
  instrument.samplerNode.disconnect();
  instrument.envelopeNode.disconnect();
  instrument.filterNode.disconnect();
  instrument.pannerNode.disconnect();

  instrument.samplerNode.chain(
    instrument.envelopeNode,
    instrument.filterNode,
    instrument.pannerNode,
    master.lowPassFilter,
    master.highPassFilter,
    master.phaser,
    master.reverb,
    master.compressor,
    Tone.Destination,
  );
}
