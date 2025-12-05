// --- WAV export engine using Tone.js Offline rendering ---

import { Offline } from "tone/build/esm/index";

import {
  InstrumentData,
  InstrumentRuntime,
} from "@/core/audio/engine/instrument/types";
import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { getMasterChainParams } from "@/features/master-bus/store/useMasterChainStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import {
  PatternChain,
  VariationId,
} from "@/features/sequencer/types/sequencer";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import {
  applyInstrumentParams,
  configureTransportTiming,
  connectInstrumentToMasterChain,
  createInstrumentRuntime,
  createOfflineSequence,
  initializeMasterChain,
  MasterChainRuntimes,
} from "../engine";
import {
  EXPORT_CHANNEL_COUNT,
  EXPORT_TAIL_TIME,
  STEP_COUNT,
} from "../engine/constants";
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
  const { pattern, chain, chainEnabled, variation } =
    usePatternStore.getState();
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
        chain,
        chainEnabled,
        variation as VariationId,
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
 * Get suggested number of bars based on the active chain.
 * We suggest two full passes of the chain to keep exports loop-friendly.
 */
export function getSuggestedBars(
  chain: PatternChain,
  chainEnabled: boolean,
): number {
  if (!chainEnabled) return 2;

  const totalRepeats = chain.steps.reduce((sum, step) => sum + step.repeats, 0);

  const recommended = Math.max(1, totalRepeats * 2);
  return Math.min(8, recommended);
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
    const runtime = await createInstrumentRuntime(instrument);

    // Apply instrument params
    applyInstrumentParams(runtime, {
      filter: instrument.params.filter,
      pan: instrument.params.pan,
      volume: instrument.params.volume,
    });

    // Connect to master chain
    connectInstrumentToMasterChain(runtime, masterChain);

    runtimes.push(runtime);
  }

  return runtimes;
}
