// --- Stem export: one pre-master WAV per channel + the full mix, zipped ---
//
// Rendering rides the single renderWav path (issue #308): each stem is a
// render with soloChannelIndex isolating one channel and masterTap
// "preMaster", so stems carry channel-level processing only and recombine
// linearly in a DAW. The full mix is rendered through the master chain (the
// production export sound) so the pack is self-contained.
//
// Lane planning is store-free like midi-exporter.ts: the feature layer
// passes the pattern, chain arrangement, and per-slot voice descriptors in
// as arguments. Lanes that would render silence - no triggers in any
// variation the arrangement plays, muted, or silenced by another channel's
// solo - are skipped and reported, so users don't get useless files.

import { strToU8, zipSync, type Zippable } from "fflate";

import { getAudioEngine } from "../engine";
import {
  sanitizeChain,
  type Pattern,
  type PatternChain,
  type VariationId,
} from "../engine/pattern-types";
import {
  advanceChainAtEndOfBar,
  variationForBarStart,
  type ChainPlaybackState,
} from "../engine/variation/chain";
import { triggerBlobDownload } from "./download";
import { encodeWav } from "./wav-encoder";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** A slot's identity and mix flags, in slot order. */
interface StemVoiceDescriptor {
  name: string;
  mute: boolean;
  solo: boolean;
}

interface StemExportOptions {
  /** Zip filename without extension; the download is `{filename}-stems.zip`. */
  filename: string;
  bars: number;
  sampleRate: number;
  /** Append the reverb/release tail after the last bar of every render. */
  includeTail: boolean;
  /** Written to the pack's README. */
  presetName: string;
  /** Written to the pack's README. */
  bpm: number;
  pattern: Pattern;
  chain: PatternChain;
  chainEnabled: boolean;
  /** Variation played for every bar when the chain is disabled. */
  variation: VariationId;
  /** Per-slot voice descriptors, in slot order. */
  voices: StemVoiceDescriptor[];
}

/** Why a lane renders silence and is therefore left out of the pack. */
type StemSkipReason = "empty" | "muted" | "not-soloed";

/** One slot's export plan: its file name and whether/why it is skipped. */
interface StemLanePlan {
  slot: number;
  name: string;
  /** `{nn}-{slot-name}.wav`, nn = slot number in slot order (01-08). */
  fileName: string;
  skipReason: StemSkipReason | null;
}

interface StemExportProgress {
  phase: "preparing" | "rendering" | "packaging" | "complete";
  percent: number;
  /** Present while rendering: "full mix" or "stem {k}/{n}". */
  label?: string;
}

interface StemExportSummary {
  zipFileName: string;
  rendered: StemLanePlan[];
  skipped: StemLanePlan[];
}

/** The full mix's entry name; 00 keeps it sorted ahead of the stems. */
const FULL_MIX_FILENAME = "00-full-mix.wav";

// -----------------------------------------------------------------------------
// Lane planning (pure, exported for tests)
// -----------------------------------------------------------------------------

/**
 * The set of variations the export arrangement actually plays: the chain
 * walked bar by bar (wrapping) when enabled, otherwise just the pushed
 * variation. Mirrors the bar arrangement of WAV and MIDI export.
 */
function variationsPlayed(
  chain: PatternChain,
  chainEnabled: boolean,
  variation: VariationId,
  bars: number,
): Set<VariationId> {
  const sanitized = sanitizeChain(chain);
  const chainState: ChainPlaybackState = {
    stepIndex: 0,
    repeatsRemaining: sanitized.steps[0]?.repeats ?? 1,
  };

  const played = new Set<VariationId>();
  for (let bar = 0; bar < bars; bar++) {
    played.add(
      variationForBarStart(chainEnabled, sanitized, chainState, variation),
    );
    advanceChainAtEndOfBar(chainEnabled, sanitized, chainState);
  }
  return played;
}

/**
 * A stem entry name: `{nn}-{slot-name}.wav` in slot order (01-08), the
 * slot name lowercased and slugged. A name with no usable characters falls
 * back to `channel-{n}`.
 */
function stemFileName(slot: number, name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const number = String(slot + 1).padStart(2, "0");
  return `${number}-${slug || `channel-${slot + 1}`}.wav`;
}

/**
 * Plans every slot's stem: its file name plus a skip reason for lanes that
 * would render silence - "empty" (no triggers in any variation the
 * arrangement plays), "muted", or "not-soloed" (another channel's solo
 * silences it). Skipped lanes are reported, never dropped silently.
 */
function planStemLanes(
  options: Pick<
    StemExportOptions,
    "pattern" | "chain" | "chainEnabled" | "variation" | "bars" | "voices"
  >,
): StemLanePlan[] {
  const played = variationsPlayed(
    options.chain,
    options.chainEnabled,
    options.variation,
    options.bars,
  );
  const anySolos = options.voices.some((voice) => voice.solo);

  return options.voices.map((voice, slot) => {
    const hasTriggers = [...played].some((variation) =>
      options.pattern.voices[slot]?.variations[variation]?.triggers.some(
        Boolean,
      ),
    );

    let skipReason: StemSkipReason | null = null;
    if (!hasTriggers) skipReason = "empty";
    else if (voice.mute) skipReason = "muted";
    else if (anySolos && !voice.solo) skipReason = "not-soloed";

    return {
      slot,
      name: voice.name,
      fileName: stemFileName(slot, voice.name),
      skipReason,
    };
  });
}

// -----------------------------------------------------------------------------
// README (pure, exported for tests)
// -----------------------------------------------------------------------------

const SKIP_REASON_TEXT: Record<StemSkipReason, string> = {
  empty: "no triggers in the exported bars",
  muted: "muted",
  "not-soloed": "silenced by another channel's solo",
};

/**
 * The pack's README: what the stems are (pre-master), what the mix is,
 * and which lanes were skipped and why.
 */
function buildStemReadme(
  options: Pick<
    StemExportOptions,
    "presetName" | "bpm" | "bars" | "sampleRate"
  >,
  lanes: StemLanePlan[],
): string {
  const rendered = lanes.filter((lane) => lane.skipReason === null);
  const skipped = lanes.filter((lane) => lane.skipReason !== null);

  const lines = [
    `${options.presetName} - stems`,
    "",
    "Exported from Drumhaus (https://www.drumhaus.io)",
    "",
    `Tempo: ${options.bpm} BPM`,
    `Length: ${options.bars} ${options.bars === 1 ? "bar" : "bars"}`,
    `Sample rate: ${options.sampleRate} Hz`,
    "",
    `${FULL_MIX_FILENAME} is the full mix, rendered through the master`,
    "chain (the production Drumhaus sound).",
    "",
    "The numbered stems are PRE-MASTER: each channel is rendered with its",
    "own tune, decay, filter, pan, and volume, but without the master-chain",
    "compression, saturation, EQ, limiting, or reverb/phaser sends, and at",
    "unity master volume. Summed together they reproduce the un-mastered",
    "mix exactly, so they rebalance cleanly under your own bus processing.",
    "",
    "Stems:",
    ...rendered.map((lane) => `  ${lane.fileName}`),
  ];

  if (skipped.length > 0) {
    lines.push(
      "",
      "Skipped (would have rendered silence):",
      ...skipped.map(
        (lane) =>
          `  ${lane.fileName} (${SKIP_REASON_TEXT[lane.skipReason as StemSkipReason]})`,
      ),
    );
  }

  return `${lines.join("\n")}\n`;
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

/**
 * Exports the current pattern as a zip of per-channel pre-master stems plus
 * the master-chain full mix and a README. Renders sequentially through the
 * engine's single render path, reporting per-stem progress. Returns a
 * summary of rendered and skipped lanes for the UI to surface.
 */
async function exportStems(
  options: StemExportOptions,
  onProgress?: (progress: StemExportProgress) => void,
): Promise<StemExportSummary> {
  onProgress?.({ phase: "preparing", percent: 0 });

  const lanes = planStemLanes(options);
  const rendered = lanes.filter((lane) => lane.skipReason === null);
  const skipped = lanes.filter((lane) => lane.skipReason !== null);

  const engine = getAudioEngine();
  const renderOptions = {
    bars: options.bars,
    sampleRate: options.sampleRate,
    includeTail: options.includeTail,
  };

  // Renders spread across 5-85%; the full mix counts as one render.
  const renderCount = rendered.length + 1;
  const renderPercent = (done: number) =>
    Math.round(5 + (done / renderCount) * 80);

  const files: Zippable = {
    "README.txt": strToU8(buildStemReadme(options, lanes)),
  };

  onProgress?.({
    phase: "rendering",
    percent: renderPercent(0),
    label: "full mix",
  });
  const mixBuffer = await engine.renderWav(renderOptions);
  files[FULL_MIX_FILENAME] = new Uint8Array(encodeWav(mixBuffer));

  for (const [index, lane] of rendered.entries()) {
    onProgress?.({
      phase: "rendering",
      percent: renderPercent(index + 1),
      label: `stem ${index + 1}/${rendered.length}`,
    });
    const stemBuffer = await engine.renderWav({
      ...renderOptions,
      soloChannelIndex: lane.slot,
      masterTap: "preMaster",
    });
    files[lane.fileName] = new Uint8Array(encodeWav(stemBuffer));
  }

  onProgress?.({ phase: "packaging", percent: 90 });

  // STORE (no compression): WAV data barely deflates and stems are large;
  // an uncompressed zip packages fast and stays streamable.
  const zip = zipSync(files, { level: 0 });

  onProgress?.({ phase: "complete", percent: 100 });

  const zipFileName = `${options.filename}-stems.zip`;
  triggerBlobDownload(
    zip as Uint8Array<ArrayBuffer>,
    zipFileName,
    "application/zip",
  );

  return { zipFileName, rendered, skipped };
}

// Bar-count suggestion is shared with WAV export so every format follows
// the same arrangement semantics.
export { getSuggestedBars } from "./wav-exporter";
export {
  buildStemReadme,
  exportStems,
  FULL_MIX_FILENAME,
  planStemLanes,
  stemFileName,
  variationsPlayed,
};
export type {
  StemExportOptions,
  StemExportProgress,
  StemExportSummary,
  StemLanePlan,
  StemSkipReason,
  StemVoiceDescriptor,
};
