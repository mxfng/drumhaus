import { KitFileV1 } from "@/types/instrument";

export function parseKitFile(dhkit: string): KitFileV1 {
  const data = JSON.parse(dhkit);

  if (data.kind !== "drumhaus.kit") {
    throw new Error("Invalid kit file type");
  }
  if (data.version !== 1) {
    throw new Error(`Unsupported kit version: ${data.version}`);
  }

  // TODO: optional: deep validation, zod, etc.

  return data as KitFileV1;
}
