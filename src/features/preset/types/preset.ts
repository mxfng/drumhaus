import { MasterChainParams } from "@/core/audio/bridge/knob-to-domain";
import { KitFileV1 } from "@/features/kit/types/kit";
import { SequencerData } from "@/features/sequencer/types/sequencer";
import { TransportParams } from "@/features/transport/types/transport";
import { InlineMeta, Meta } from "./meta";

// Presets hold all serializable data for a project
// They are always deconstructed at runtime into their respective stores
//
// Versions 1 and 1.5 share this exact shape ("V1" names the knob-space file
// family); version 1.5 marks the #269 swing retune, which reinterpreted the
// persisted swing knob value. Runtime objects are normalized to version 1.5
// on load (migratePresetFileVersion); version 1 can still appear in
// objects read verbatim from storage before normalization.
interface PresetFileV1 {
  kind: "drumhaus.preset";
  version: 1 | 1.5;
  meta: Meta;
  kit: KitFileV1;
  transport: TransportParams;
  sequencer: SequencerData;
  masterChain: MasterChainParams;
}

// The minimal shape a preset list needs: identity meta only. Both
// PresetFileV1 (factory presets) and PresetDocument (library entries) satisfy
// it, so list UIs and name helpers can take either without caring which
// serialization family they hold.
interface PresetListItem {
  meta: InlineMeta;
}

export type { PresetFileV1, PresetListItem };
