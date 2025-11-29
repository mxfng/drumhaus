// --- WAV export engine using Tone.js Offline rendering ---

import { Offline } from "tone/build/esm/index";

import { useInstrumentsStore } from "@/features/instruments/store/useInstrumentsStore";
import type {
  InstrumentData,
  InstrumentRuntime,
} from "@/features/instruments/types/instrument";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { getMasterChainParams } from "@/stores/useMasterChainStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { VariationCycle } from "@/types/preset";
import {
  EXPORT_CHANNEL_COUNT,
  EXPORT_TAIL_TIME,
  STEP_COUNT,
} from "../engine/constants";
import {
  configureTransportTiming,
  createOfflineSequence,
} from "../engine/drumSequence";
import { applyInstrumentParams } from "../engine/instrumentParams";
import { buildInstrumentRuntime } from "../engine/instrumentRuntimes";
import {
  connectInstrumentRuntime,
  initializeMasterChain,
  MasterChainRuntimes,
} from "../engine/masterChain";
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
  const barDuration = options.bars * STEP_COUNT * stepDuration;

  // Add tail for reverb/release decay if requested, otherwise end on bar line for DAW looping
  const tailTime = options.includeTail ? EXPORT_TAIL_TIME : 0;
  const duration = barDuration + tailTime;

  onProgress?.({ phase: "rendering", percent: 10 });

  // Render offline
  const audioBuffer = await Offline(
    async ({ transport, destination }) => {
      // Configure transport
      configureTransportTiming(transport, bpm, swing);

      // Build master chain using shared initialization
      const masterChain = await initializeMasterChain(
        masterChainParams,
        destination,
      );

      // Build instrument runtimes
      const runtimes = await buildOfflineInstrumentRuntimes(
        instruments,
        masterChain,
      );

      // Create sequence - uses same Tone.js Sequence as live playback
      // so transport swing is applied identically
      createOfflineSequence(
        pattern,
        instruments,
        runtimes,
        variationCycle,
        options.bars,
      );

      // Start transport
      transport.start(0);
    },
    duration,
    EXPORT_CHANNEL_COUNT,
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
      return 2;
    case "AB":
      return 4;
    case "AAAB":
      return 8;
    default:
      return 2;
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

async function buildOfflineInstrumentRuntimes(
  instruments: InstrumentData[],
  masterChain: MasterChainRuntimes,
): Promise<InstrumentRuntime[]> {
  const runtimes: InstrumentRuntime[] = [];

  for (const instrument of instruments) {
    // Build runtime using shared builder
    const runtime = await buildInstrumentRuntime(instrument);

    // Apply instrument params
    applyInstrumentParams(runtime, {
      attack: instrument.params.attack,
      filter: instrument.params.filter,
      pan: instrument.params.pan,
      volume: instrument.params.volume,
    });

    // Connect to master chain
    connectInstrumentRuntime(runtime, masterChain);

    runtimes.push(runtime);
  }

  return runtimes;
}
