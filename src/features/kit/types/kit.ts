import { InstrumentData } from "@/features/instrument/types/instrument";
import { Meta } from "@/features/preset/types/meta";

/**
 * The kit registry file shape (`.dhkit`).
 *
 * The registry is bundled-only and regenerated with the app, so there is one
 * right shape rather than a version series (docs/data-representation.md, PR D):
 * `instruments` hold CANONICAL params (seconds, dB, -1..1 pan, semitones, a
 * `{ side, cutoffHz }` filter), exactly like the stores. The old knob-shaped
 * kit survives only inside legacy `.dh` files, in the legacy-read island
 * (features/preset/types/legacy-v1.ts).
 */
interface KitFile {
  kind: "drumhaus.kit";
  meta: Meta; // kit-level metadata
  instruments: InstrumentData[];
}

export type { KitFile };
