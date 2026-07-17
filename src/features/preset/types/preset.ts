import { InlineMeta } from "./meta";

// The minimal shape a preset list needs: identity meta only. Factory presets
// and library entries are both PresetDocument (2.1) values, so list UIs and
// name helpers can take either without caring which one they hold.
interface PresetListItem {
  meta: InlineMeta;
}

export type { PresetListItem };
