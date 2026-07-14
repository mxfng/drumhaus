/**
 * Store-facing instrument data model.
 *
 * This is the shape held by the instruments store and serialized in kits
 * and presets. The audio engine never sees it: the bridge converts params
 * to domain units and pushes them into the engine per channel.
 */

import type { InstrumentRole } from "@/core/audio/engine/instrument/types";
import { SampleData } from "@/features/kit/types/sample";
import { InlineMeta } from "@/features/preset/types/meta";

interface InstrumentParams {
  decay: number;
  filter: number;
  volume: number;
  pan: number;
  tune: number;
  solo: boolean;
  mute: boolean;
}

interface InstrumentData {
  meta: InlineMeta; // id + display name of this pad
  role: InstrumentRole; // where it lives conceptually in the kit
  sample: SampleData;
  params: InstrumentParams;
}

export type { InstrumentData, InstrumentParams };
