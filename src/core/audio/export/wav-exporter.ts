// --- WAV export engine using Tone.js Offline rendering ---

import { Offline, type ToneAudioNode } from "tone/build/esm/index";

import {
  InstrumentData,
  InstrumentRuntime,
} from "@/core/audio/engine/instrument/types";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { getMasterChainParams } from "@/features/master-bus/store/use-master-chain-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import {
  PatternChain,
  VariationId,
} from "@/features/sequencer/types/sequencer";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import {
  applyInstrumentParams,
  chainInstrumentNodes,
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
import { downloadWav, downloadZip, encodeWav } from "./wav-encoder";
import { createZip, ZipEntry } from "./zip-writer";

interface ExportOptions {
  bars: number;
  sampleRate: number;
  includeTail: boolean;
  filename: string;
  /**
   * When exporting stems, bypass the master bus FX (compressor, limiter,
   * reverb, saturation, EQ) so each stem carries only its own channel strip.
   * Ignored by the combined mix export. Defaults to dry (true) at the UI.
   */
  dry?: boolean;
}

interface ExportProgress {
  phase: "preparing" | "rendering" | "encoding" | "complete";
  percent: number;
}

/**
 * Snapshot of the audio state required to render a pattern offline.
 */
interface RenderState {
  pattern: ReturnType<typeof usePatternStore.getState>["pattern"];
  chain: PatternChain;
  chainEnabled: boolean;
  variation: VariationId;
  instruments: InstrumentData[];
  bpm: number;
  swing: number;
  masterChainParams: ReturnType<typeof getMasterChainParams>;
}

/**
 * Exports the current pattern to a single combined WAV file.
 */
async function exportToWav(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "preparing", percent: 0 });

  const state = gatherRenderState();
  const duration = getRenderDuration(options, state.bpm);

  onProgress?.({ phase: "rendering", percent: 10 });

  // Full mix: honor the current solo/mute state and play every instrument.
  const audioBuffer = await renderPattern(state, options, duration);

  onProgress?.({ phase: "encoding", percent: 80 });

  const nativeBuffer = audioBuffer.get();
  if (!nativeBuffer) {
    throw new Error("Failed to render audio buffer");
  }
  const wavBuffer = encodeWav(nativeBuffer);

  onProgress?.({ phase: "complete", percent: 100 });

  downloadWav(wavBuffer, `${options.filename}.wav`);
}

/**
 * Exports each instrument as its own WAV stem, bundled into a single ZIP.
 *
 * Every stem is rendered through the full arrangement (all instruments are
 * triggered) but only the target instrument is routed to the master chain.
 * This preserves cross-instrument behavior such as the closed hat choking the
 * open hat (TR-909 style) so the open-hat stem decays exactly as it does in the
 * combined mix. Solo/mute are neutralized so every pad prints a complete stem
 * regardless of transient performance state; pads that produce silence (empty
 * or choked to nothing) are omitted from the archive.
 */
async function exportStemsToWav(
  options: ExportOptions,
  onProgress?: (progress: ExportProgress) => void,
): Promise<void> {
  onProgress?.({ phase: "preparing", percent: 0 });

  const baseState = gatherRenderState();
  // Neutralize solo/mute so each pad prints its full stem.
  const state: RenderState = {
    ...baseState,
    instruments: baseState.instruments.map((instrument) => ({
      ...instrument,
      params: { ...instrument.params, solo: false, mute: false },
    })),
  };

  const duration = getRenderDuration(options, state.bpm);
  const entries: ZipEntry[] = [];
  const usedNames = new Set<string>();
  const total = state.instruments.length;

  for (let index = 0; index < total; index++) {
    onProgress?.({
      phase: "rendering",
      percent: 10 + Math.round((index / Math.max(total, 1)) * 70),
    });

    const audioBuffer = await renderPattern(state, options, duration, {
      audibleInstrumentIndex: index,
      dry: options.dry ?? false,
    });
    const nativeBuffer = audioBuffer.get();
    if (!nativeBuffer || isSilent(nativeBuffer)) continue;

    const wavBuffer = encodeWav(nativeBuffer);
    const name = uniqueStemName(state.instruments[index], index, usedNames);
    entries.push({ name, data: wavBuffer });
  }

  if (entries.length === 0) {
    throw new Error("No audible stems to export");
  }

  onProgress?.({ phase: "encoding", percent: 80 });

  const zipBuffer = createZip(entries);

  onProgress?.({ phase: "complete", percent: 100 });

  downloadZip(zipBuffer, `${options.filename}-stems.zip`);
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

// --- Private helpers ---

function gatherRenderState(): RenderState {
  const { pattern, chain, chainEnabled, variation } =
    usePatternStore.getState();
  const { instruments } = useInstrumentsStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  const masterChainParams = getMasterChainParams();

  return {
    pattern,
    chain,
    chainEnabled,
    variation: variation as VariationId,
    instruments,
    bpm,
    swing,
    masterChainParams,
  };
}

/**
 * Total render duration: the bars plus an optional reverb/FX tail.
 */
function getRenderDuration(
  options: Pick<ExportOptions, "bars" | "includeTail">,
  bpm: number,
): number {
  const stepDuration = 60 / bpm / 4; // Duration of one 16th note in seconds
  const barDuration = options.bars * STEP_COUNT * stepDuration;
  const tailTime = options.includeTail ? EXPORT_TAIL_TIME : 0;
  return barDuration + tailTime;
}

/**
 * Per-render routing options for {@link renderPattern}.
 */
interface RenderRouting {
  /**
   * When set, only this instrument is routed to the output (isolated stem).
   * Every instrument is still built and triggered so cross-instrument behavior
   * (e.g. hat choking) is preserved. When omitted, every instrument is routed
   * (full mix).
   */
  audibleInstrumentIndex?: number;
  /**
   * When true, the audible instrument is routed straight to the destination,
   * bypassing the master bus FX. When false, the master chain is rendered.
   */
  dry?: boolean;
}

/**
 * Renders the pattern offline.
 *
 * See {@link RenderRouting} for how `audibleInstrumentIndex` and `dry` shape
 * the signal path.
 */
async function renderPattern(
  state: RenderState,
  options: Pick<ExportOptions, "sampleRate" | "bars">,
  duration: number,
  routing: RenderRouting = {},
) {
  return await Offline(
    async ({ transport, destination }) => {
      configureTransportTiming(transport, state.bpm, state.swing);

      // Dry stems skip the master bus entirely and feed the destination
      // directly. Wet/combined renders build the full master chain.
      const masterChain = routing.dry
        ? null
        : await initializeMasterChain(state.masterChainParams, destination);

      const runtimes = await buildOfflineInstrumentRuntimes(
        state.instruments,
        masterChain,
        destination,
        routing.audibleInstrumentIndex,
      );

      createOfflineSequence(
        state.pattern,
        state.instruments,
        runtimes,
        state.chain,
        state.chainEnabled,
        state.variation,
        options.bars,
      );

      transport.start(0);
    },
    duration,
    EXPORT_CHANNEL_COUNT,
    options.sampleRate,
  );
}

async function buildOfflineInstrumentRuntimes(
  instruments: InstrumentData[],
  masterChain: MasterChainRuntimes | null,
  destination: ToneAudioNode,
  audibleInstrumentIndex?: number,
): Promise<InstrumentRuntime[]> {
  const runtimes: InstrumentRuntime[] = [];

  for (let index = 0; index < instruments.length; index++) {
    const instrument = instruments[index];

    // Build runtime using shared builder
    const runtime = await createInstrumentRuntime(instrument);

    // Apply instrument params
    applyInstrumentParams(runtime, {
      filter: instrument.params.filter,
      pan: instrument.params.pan,
      volume: instrument.params.volume,
    });

    // Only the target instrument is routed to the output. Other instruments
    // are still built and triggered (preserving hat choking and any other
    // cross-instrument behavior) but produce no output.
    const isAudible =
      audibleInstrumentIndex === undefined || audibleInstrumentIndex === index;
    if (isAudible) {
      if (masterChain) {
        // Wet/combined: instrument channel strip → master chain.
        connectInstrumentToMasterChain(runtime, masterChain);
      } else {
        // Dry stem: instrument channel strip → destination, bypassing master.
        chainInstrumentNodes(runtime);
        runtime.pannerNode.connect(destination);
      }
    }

    runtimes.push(runtime);
  }

  return runtimes;
}

/**
 * Returns true if every sample across every channel is silent.
 */
function isSilent(buffer: AudioBuffer): boolean {
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < data.length; i++) {
      if (data[i] !== 0) return false;
    }
  }
  return true;
}

/**
 * Builds a filesystem-safe, collision-free stem filename.
 */
function uniqueStemName(
  instrument: InstrumentData,
  index: number,
  used: Set<string>,
): string {
  const prefix = String(index + 1).padStart(2, "0");
  const safeName =
    instrument.meta.name
      .trim()
      .replace(/[^a-z0-9-_ ]/gi, "")
      .replace(/\s+/g, "_") || "stem";

  let name = `${prefix}_${safeName}.wav`;
  let suffix = 2;
  while (used.has(name)) {
    name = `${prefix}_${safeName}_${suffix}.wav`;
    suffix++;
  }
  used.add(name);
  return name;
}

export {
  exportToWav,
  exportStemsToWav,
  getSuggestedBars,
  calculateExportDuration,
};
export type { ExportOptions, ExportProgress };
