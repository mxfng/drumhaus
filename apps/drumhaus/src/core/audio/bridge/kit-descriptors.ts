/**
 * InstrumentData -> KitSampleDescriptor boundary mapping.
 *
 * The engine loads kits from descriptor tuples (instrumentId, samplePath,
 * role); this is the one place the store-facing instrument model maps to
 * them, shared by the bridge and the golden-render fixture.
 */

import type { KitSampleDescriptor } from "@/core/audio/engine/audio-engine";
import type { InstrumentData } from "@/features/instrument/types/instrument";

/**
 * Maps instruments to the descriptor tuples engine.loadKit consumes.
 */
function toKitSampleDescriptors(
  instruments: InstrumentData[],
): KitSampleDescriptor[] {
  return instruments.map((instrument) => ({
    instrumentId: instrument.meta.id,
    samplePath: instrument.sample.path,
    role: instrument.role,
  }));
}

/**
 * Whether the instruments' descriptor tuples differ from the loaded kit.
 * Early-exits on the first differing field, so params-only store updates
 * (knob drags) compare equal without mapping or string building.
 */
function kitDescriptorsChanged(
  kit: KitSampleDescriptor[],
  instruments: InstrumentData[],
): boolean {
  return (
    kit.length !== instruments.length ||
    instruments.some(
      (instrument, index) =>
        instrument.meta.id !== kit[index].instrumentId ||
        instrument.sample.path !== kit[index].samplePath ||
        instrument.role !== kit[index].role,
    )
  );
}

export { kitDescriptorsChanged, toKitSampleDescriptors };
