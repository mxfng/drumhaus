// --- WAV export engine using Tone.js Offline rendering ---

import {
  AmplitudeEnvelope,
  Compressor,
  Filter,
  Gain,
  Offline,
  Panner,
  Phaser,
  Reverb,
  Sampler,
  ToneAudioNode,
} from "tone/build/esm/index";

import {
  KNOB_ROTATION_THRESHOLD_L,
  transformKnobFilterValue,
  transformKnobValue,
  transformKnobValueExponential,
} from "@/components/common/knobTransforms";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { useMasterChainStore } from "@/stores/useMasterChainStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentData } from "@/types/instrument";
import type { Voice } from "@/types/pattern";
import type { MasterChainParams, VariationCycle } from "@/types/preset";
import { getCachedAudioUrl } from "../cache";
import {
  INSTRUMENT_ATTACK_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_RELEASE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
  MASTER_COMP_RATIO_RANGE,
  MASTER_COMP_THRESHOLD_RANGE,
  MASTER_FILTER_RANGE,
  MASTER_PHASER_WET_RANGE,
  MASTER_REVERB_DECAY_RANGE,
  MASTER_REVERB_WET_RANGE,
  MASTER_VOLUME_RANGE,
  SAMPLER_ROOT_NOTE,
  STEP_COUNT,
} from "../engine/constants";
import { transformPitchKnobToFrequency } from "../engine/pitch";
import { downloadWav, encodeWav } from "./wavEncoder";

export interface ExportOptions {
  bars: number;
  sampleRate: number;
  includeTail: boolean;
  filename: string;
}

export interface ExportProgress {
  phase: "preparing" | "rendering" | "encoding" | "complete";
  percent: number;
}

type OfflineInstrumentRuntime = {
  instrumentId: string;
  samplerNode: Sampler;
  envelopeNode: AmplitudeEnvelope;
  filterNode: Filter;
  pannerNode: Panner;
};

type OfflineMasterChain = {
  lowPassFilter: Filter;
  highPassFilter: Filter;
  phaser: Phaser;
  reverb: Reverb;
  compressor: Compressor;
  masterGain: Gain;
};

/**
 * Exports the current pattern to WAV file
 */
export async function exportToWav(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "preparing", percent: 0 });

  // Gather current state from stores
  const { pattern, variationCycle } = usePatternStore.getState();
  const { instruments } = useInstrumentsStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  const masterChainParams = getMasterChainParams();

  // Calculate duration
  const stepDuration = 60 / bpm / 4; // Duration of one 16th note in seconds
  const totalSteps = options.bars * STEP_COUNT;
  const barDuration = totalSteps * stepDuration;

  // Add tail for reverb/release decay if requested, otherwise end on bar line for DAW looping
  const tailTime = options.includeTail ? 2 : 0;
  const duration = barDuration + tailTime;

  onProgress?.({ phase: "rendering", percent: 10 });

  // Render offline
  const audioBuffer = await Offline(
    async ({ transport, destination }) => {
      // Configure transport
      transport.bpm.value = bpm;
      transport.swing = (swing / 100) * 0.5;
      transport.swingSubdivision = "16n";

      // Build master chain
      const masterChain = await buildOfflineMasterChain(
        masterChainParams,
        destination,
      );

      // Build instrument runtimes
      const runtimes = await buildOfflineInstrumentRuntimes(
        instruments,
        masterChain,
      );

      // Check for solos
      const anySolos = instruments.some((inst) => inst.params.solo);

      // Find open hat index for hat cutoff logic
      const ohatIndex = instruments.findIndex((inst) => inst.role === "ohat");
      const hasOhat = ohatIndex !== -1;

      // Schedule all events
      let currentBar = 0;
      let currentVariation = computeVariationIndex(variationCycle, 0, 0);

      for (let step = 0; step < totalSteps; step++) {
        const stepInBar = step % STEP_COUNT;
        const time = step * stepDuration;

        // Update variation at start of each bar
        if (stepInBar === 0 && step > 0) {
          currentBar = updateBarIndex(variationCycle, currentBar);
          currentVariation = computeVariationIndex(
            variationCycle,
            currentBar,
            currentVariation,
          );
        }

        // Schedule each voice
        for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
          scheduleVoiceStep(
            pattern[voiceIndex],
            stepInBar,
            time,
            currentVariation,
            instruments,
            runtimes,
            anySolos,
            hasOhat,
            ohatIndex,
          );
        }
      }

      // Start transport
      transport.start(0);
    },
    duration,
    2, // stereo
    options.sampleRate,
  );

  onProgress?.({ phase: "encoding", percent: 80 });

  // Encode to WAV - convert ToneAudioBuffer to native AudioBuffer
  const nativeBuffer = audioBuffer.get();
  if (!nativeBuffer) {
    throw new Error("Failed to render audio buffer");
  }
  const wavBuffer = encodeWav(nativeBuffer);

  onProgress?.({ phase: "complete", percent: 100 });

  // Trigger download
  const filename = `${options.filename}.wav`;
  downloadWav(wavBuffer, filename);
}

/**
 * Get suggested number of bars based on variation cycle
 */
export function getSuggestedBars(variationCycle: VariationCycle): number {
  switch (variationCycle) {
    case "A":
    case "B":
      return 1;
    case "AB":
      return 2;
    case "AAAB":
      return 4;
    default:
      return 1;
  }
}

/**
 * Calculate export duration in seconds
 */
export function calculateExportDuration(bars: number, bpm: number): number {
  const stepDuration = 60 / bpm / 4;
  return bars * STEP_COUNT * stepDuration;
}

// --- Private helpers ---

function getMasterChainParams(): MasterChainParams {
  const state = useMasterChainStore.getState();
  return {
    lowPass: state.lowPass,
    highPass: state.highPass,
    phaser: state.phaser,
    reverb: state.reverb,
    compThreshold: state.compThreshold,
    compRatio: state.compRatio,
    masterVolume: state.masterVolume,
  };
}

async function buildOfflineMasterChain(
  params: MasterChainParams,
  destination: ToneAudioNode,
): Promise<OfflineMasterChain> {
  const lowPassFreq = transformKnobValueExponential(
    params.lowPass,
    MASTER_FILTER_RANGE,
  );
  const highPassFreq = transformKnobValueExponential(
    params.highPass,
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
  const masterVolume = transformKnobValue(
    params.masterVolume,
    MASTER_VOLUME_RANGE,
  );

  const lowPassFilter = new Filter(lowPassFreq, "lowpass");
  const highPassFilter = new Filter(highPassFreq, "highpass");
  const phaser = new Phaser({
    frequency: 1,
    octaves: 3,
    baseFrequency: 1000,
    wet: phaserWet,
  });

  const reverb = new Reverb({
    decay: reverbDecay,
    wet: reverbWet,
  });
  await reverb.generate();

  const compressor = new Compressor({
    threshold: compThreshold,
    ratio: compRatio,
    attack: 0.5,
    release: 1,
  });

  const masterGain = new Gain(Math.pow(10, masterVolume / 20));

  // Chain to destination
  lowPassFilter.chain(
    highPassFilter,
    phaser,
    reverb,
    compressor,
    masterGain,
    destination,
  );

  return {
    lowPassFilter,
    highPassFilter,
    phaser,
    reverb,
    compressor,
    masterGain,
  };
}

async function buildOfflineInstrumentRuntimes(
  instruments: InstrumentData[],
  masterChain: OfflineMasterChain,
): Promise<OfflineInstrumentRuntime[]> {
  const runtimes: OfflineInstrumentRuntime[] = [];

  for (const instrument of instruments) {
    const filterNode = new Filter(0, "highpass");
    const envelopeNode = new AmplitudeEnvelope(0, 0, 1, 0.05);
    const pannerNode = new Panner(0);

    // Get sample URL
    let url: string;
    try {
      url = await getCachedAudioUrl(instrument.sample.path);
    } catch {
      url = `/samples/${instrument.sample.path}`;
    }

    // Create sampler and wait for it to load
    const samplerNode = await new Promise<Sampler>((resolve, reject) => {
      const sampler = new Sampler({
        urls: { [SAMPLER_ROOT_NOTE]: url },
        onload: () => resolve(sampler),
        onerror: (err) => reject(err),
      });
    });

    // Apply instrument params
    const params = instrument.params;

    envelopeNode.attack = transformKnobValue(
      params.attack,
      INSTRUMENT_ATTACK_RANGE,
    );

    filterNode.type =
      params.filter <= KNOB_ROTATION_THRESHOLD_L ? "lowpass" : "highpass";
    filterNode.frequency.value = transformKnobFilterValue(params.filter);

    pannerNode.pan.value = transformKnobValue(params.pan, INSTRUMENT_PAN_RANGE);
    samplerNode.volume.value = transformKnobValue(
      params.volume,
      INSTRUMENT_VOLUME_RANGE,
    );

    // Connect to master chain
    samplerNode.chain(
      envelopeNode,
      filterNode,
      pannerNode,
      masterChain.lowPassFilter,
    );

    runtimes.push({
      instrumentId: instrument.meta.id,
      samplerNode,
      envelopeNode,
      filterNode,
      pannerNode,
    });
  }

  return runtimes;
}

function scheduleVoiceStep(
  voice: Voice,
  stepInBar: number,
  time: number,
  variationIndex: number,
  instruments: InstrumentData[],
  runtimes: OfflineInstrumentRuntime[],
  anySolos: boolean,
  hasOhat: boolean,
  ohatIndex: number,
): void {
  const instrumentIndex = voice.instrumentIndex;
  const inst = instruments[instrumentIndex];
  const runtime = runtimes[instrumentIndex];

  if (!inst || !runtime) return;

  const params = inst.params;
  const variation = voice.variations[variationIndex];
  const triggers = variation.triggers;
  const velocities = variation.velocities;

  if (!triggers[stepInBar]) return;
  if ((anySolos && !params.solo) || params.mute) return;

  const velocity = velocities[stepInBar];
  const pitch = transformPitchKnobToFrequency(params.pitch);
  const releaseTime = transformKnobValueExponential(
    params.release,
    INSTRUMENT_RELEASE_RANGE,
  );

  // Closed hat mutes open hat
  if (inst.role === "hat" && hasOhat) {
    const ohInst = instruments[ohatIndex];
    const ohRuntime = runtimes[ohatIndex];
    if (ohInst && ohRuntime) {
      const ohPitch = transformPitchKnobToFrequency(ohInst.params.pitch);
      ohRuntime.samplerNode.triggerRelease(ohPitch, time);
    }
  }

  // Trigger the instrument
  if (inst.role === "ohat") {
    // Open hat - attack/release envelope
    runtime.envelopeNode.triggerAttack(time);
    runtime.envelopeNode.triggerRelease(time + releaseTime);
    runtime.samplerNode.triggerAttack(pitch, time, velocity);
  } else {
    // Standard instrument
    runtime.samplerNode.triggerRelease(pitch, time);
    runtime.envelopeNode.triggerAttack(time);
    runtime.envelopeNode.triggerRelease(time + releaseTime);
    runtime.samplerNode.triggerAttack(pitch, time, velocity);
  }
}

function computeVariationIndex(
  variationCycle: VariationCycle,
  currentBarIndex: number,
  currentVariationIndex: number,
): number {
  switch (variationCycle) {
    case "A":
      return 0;
    case "B":
      return 1;
    case "AB":
      return currentBarIndex === 0 ? 0 : 1;
    case "AAAB":
      return currentBarIndex === 3 ? 1 : 0;
    default:
      return currentVariationIndex;
  }
}

function updateBarIndex(
  variationCycle: VariationCycle,
  currentBar: number,
): number {
  if (
    variationCycle === "A" ||
    variationCycle === "B" ||
    (variationCycle === "AB" && currentBar > 0) ||
    (variationCycle === "AAAB" && currentBar > 2)
  ) {
    return 0;
  }
  return currentBar + 1;
}
