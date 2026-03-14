import { InlineMeta } from "@/features/preset/types/meta";

enum AttributionStatus {
  Unknown = "unknown",
  Self = "self",
  SamplePack = "samplePack",
  PublicDomain = "publicDomain",
  Other = "other",
}

interface SampleAttribution {
  status: AttributionStatus;
  label?: string;
  creditName?: string;
  url?: string;
  notes?: string;
}

interface SampleData {
  meta: InlineMeta;
  path: string; // relative to known root in public/samples/
  attribution?: SampleAttribution;
}

export { AttributionStatus };
export type { SampleAttribution, SampleData };
