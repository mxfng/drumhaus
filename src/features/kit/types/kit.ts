import { InstrumentData } from "@/core/audio/engine/instrument/types";
import { Meta } from "@/features/preset/types/meta";

/**
 * Represents the kit file schema
 */
export interface KitFileV1 {
  kind: "drumhaus.kit";
  version: 1;
  meta: Meta; // kit-level metadata
  instruments: InstrumentData[];
}
