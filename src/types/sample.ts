import { InlineMeta } from "./meta";

export enum AttributionStatus {
  Unknown = "unknown",
  Self = "self",
  SamplePack = "samplePack",
  PublicDomain = "publicDomain",
  Other = "other",
}

export interface SampleAttribution {
  status: AttributionStatus;
  label?: string;
  creditName?: string;
  url?: string;
  notes?: string;
}

export interface SampleData {
  meta: InlineMeta;
  path: string; // relative to known root in public/samples/
  attribution?: SampleAttribution;
}
