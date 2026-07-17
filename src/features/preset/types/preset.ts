import { InlineMeta } from "./meta";

// The minimal shape a preset list needs: identity meta only. Both
// PresetFileV1 (factory presets) and PresetDocument (library entries) satisfy
// it, so list UIs and name helpers can take either without caring which
// serialization family they hold.
interface PresetListItem {
  meta: InlineMeta;
}

export type { PresetListItem };
