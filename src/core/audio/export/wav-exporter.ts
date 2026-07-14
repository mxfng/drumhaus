// --- WAV export: offline render via the engine, then encode + download ---

import { getAudioEngine, type PatternChain } from "../engine";
import { STEP_COUNT } from "../engine/constants";
import { downloadWav, encodeWav } from "./wav-encoder";

interface ExportOptions {
  bars: number;
  sampleRate: number;
  includeTail: boolean;
  filename: string;
}

interface ExportProgress {
  phase: "preparing" | "rendering" | "encoding" | "complete";
  percent: number;
}

/**
 * Exports the current pattern to a WAV file.
 *
 * The render is a pure function of the engine's retained state (pattern,
 * playback config, channel params, master settings, bpm, swing, kit) - no
 * store reads happen here, so exports can never drift from live playback.
 */
async function exportToWav(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "preparing", percent: 0 });
  onProgress?.({ phase: "rendering", percent: 10 });

  const audioBuffer = await getAudioEngine().renderWav({
    bars: options.bars,
    sampleRate: options.sampleRate,
    includeTail: options.includeTail,
  });

  onProgress?.({ phase: "encoding", percent: 80 });

  const wavBuffer = encodeWav(audioBuffer);

  onProgress?.({ phase: "complete", percent: 100 });

  // Trigger download
  const filename = `${options.filename}.wav`;
  downloadWav(wavBuffer, filename);
}

/**
 * Get suggested number of bars based on the active chain.
 * We suggest two full passes of the chain to keep exports loop-friendly.
 */
function getSuggestedBars(chain: PatternChain, chainEnabled: boolean): number {
  if (!chainEnabled) return 2;

  const totalRepeats = chain.steps.reduce((sum, step) => sum + step.repeats, 0);

  const recommended = Math.max(1, totalRepeats * 2);
  return Math.min(8, recommended);
}

/**
 * Calculate export duration in seconds
 */
function calculateExportDuration(bars: number, bpm: number): number {
  const stepDuration = 60 / bpm / 4;
  return bars * STEP_COUNT * stepDuration;
}

export { exportToWav, getSuggestedBars, calculateExportDuration };
export type { ExportOptions, ExportProgress };
