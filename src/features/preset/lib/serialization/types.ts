import { InstrumentParams } from "@/features/instrument/types/instrument";
import { MasterChainParams } from "@/features/master-bus/types/master";
import { VariationCycle } from "@/features/sequencer/types/sequencer";
import { TransportParams } from "@/features/transport/types/transport";
import { Meta } from "../../types/meta";

/**
 * Optimized preset format for URL sharing
 * - Lossless: preserves all metadata (dates, author, etc.)
 * - Optimized: only stores kit reference + params for default kits
 * - Only supports default kits (custom kits not shareable - no hosted samples)
 */
export interface ShareablePreset {
  kind: "drumhaus.preset.shareable";
  version: 1;

  // Lossless preset metadata
  meta: Meta; // id, name, createdAt, updatedAt, author

  // Kit reference + params only (default kits only)
  kit: ShareableKit;

  // Fully mutable data (store as-is)
  transport: TransportParams; // bpm, swing
  sequencer: {
    pattern: OptimizedPattern;
    variationCycle: VariationCycle;
  };
  masterChain: MasterChainParams; // All 7 effect params
}

/**
 * Kit data for URL sharing
 * - Only supports default kits (kit IDs starting with "kit-")
 * - Stores kit metadata + instrument params only
 * - Sample/role data rehydrated from kit registry
 */
export interface ShareableKit {
  meta: Meta; // Kit metadata (lossless)
  defaultKitId: string; // "kit-drumhaus", "kit-techno", etc.
  instrumentParams: InstrumentParams[]; // 8 params objects (only mutable data)
}

/**
 * Optimized pattern format with sparse velocity encoding
 */
export interface OptimizedPattern {
  voices: OptimizedVoice[]; // 8 voices
}

export interface OptimizedVoice {
  instrumentIndex: number; // 0-7
  variations: [OptimizedStepSequence, OptimizedStepSequence]; // [A, B]
}

export interface OptimizedStepSequence {
  triggers: boolean[]; // 16 booleans (will compress to 2 bytes with bit packing)

  // Sparse velocities: only store non-1.0 values
  // Example: { "2": 0.56, "7": 0.82 } means steps 2 and 7 have custom velocities
  // All other steps default to 1.0
  velocities: { [stepIndex: string]: number };

  // Timing nudge: only store if non-zero (for backward compatibility)
  // -2 to +2 range, defaults to 0 if missing
  timingNudge?: number;
}
