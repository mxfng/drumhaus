import { MasterChainParams } from "@/core/audio/engine/types/master";
import { KitFileV1 } from "@/features/kit/types/kit";
import { SequencerData } from "@/features/sequencer/types/sequencer";
import { TransportParams } from "@/features/transport/types/transport";
import { Meta } from "./meta";

// Presets hold all serializable data for a project
// They are always deconstructed at runtime into their respective stores
export interface PresetFileV1 {
  kind: "drumhaus.preset";
  version: 1;
  meta: Meta;
  kit: KitFileV1;
  transport: TransportParams;
  sequencer: SequencerData;
  masterChain: MasterChainParams;
}
