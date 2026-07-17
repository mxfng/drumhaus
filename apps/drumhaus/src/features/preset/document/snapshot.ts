/**
 * The egress half of the preset pipeline: snapshot the live stores as a
 * canonical preset document (docs/preset-persistence.md; docs/data-
 * representation.md). Every egress is snapshot() -> encode: exports, shares,
 * the session autosave, library saves, and dirty detection all flow through
 * here.
 *
 * The stores now hold canonical units, so this is a DIRECT read - no
 * knob->domain crossing, and the frozen v1 migration is off the live path
 * (V5). The only shaping is the field renames the document schema uses
 * (decay -> decaySeconds, volume -> volumeDb with null for silence, tune ->
 * tuneSemitones) and folding the master chain into the document's shape.
 *
 * Deliberately not exported from the document barrel (see index.ts): this
 * module reads the stores, whose import graph reaches back into the barrel.
 */

import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import type { InstrumentParams } from "@/features/instrument/types/instrument";
import { getMasterChainParams } from "@/features/master-bus/store/use-master-chain-store";
import type { Meta } from "@/features/preset/types/meta";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import {
  PRESET_DOCUMENT_KIND,
  PRESET_DOCUMENT_VERSION,
  presetDocumentSchema,
  type PresetDocument,
} from "./document";

/** -Infinity dB (silence) is spelled null in the JSON-safe document. */
function volumeToDb(volume: number): number | null {
  return volume === -Infinity ? null : volume;
}

function channelFromParams(params: InstrumentParams) {
  return {
    decaySeconds: params.decay,
    filter: params.filter,
    volumeDb: volumeToDb(params.volume),
    pan: params.pan,
    tuneSemitones: params.tune,
    mute: params.mute,
    solo: params.solo,
  };
}

/**
 * Snapshot the current store state as a canonical preset document.
 *
 * @param presetMeta - Identity for the snapshot (minted fresh by exports)
 * @param kitMeta - The current kit's metadata; its id must resolve in the
 * registry
 */
function snapshotPresetDocument(
  presetMeta: Meta,
  kitMeta: Meta,
): PresetDocument {
  const instruments = useInstrumentsStore.getState().instruments;
  const { pattern, chain, chainEnabled } = usePatternStore.getState();
  const { bpm, swing } = useTransportStore.getState();
  const master = getMasterChainParams();

  return presetDocumentSchema.parse({
    kind: PRESET_DOCUMENT_KIND,
    version: PRESET_DOCUMENT_VERSION,
    meta: {
      ...presetMeta,
      updatedAt: new Date().toISOString(),
    },
    kit: { id: kitMeta.id },
    channels: instruments.map((instrument) =>
      channelFromParams(instrument.params),
    ),
    pattern,
    playback: { chain, chainEnabled },
    transport: { bpm, swing },
    master: {
      filter: master.filter,
      saturation: master.saturation,
      phaser: master.phaser,
      reverb: master.reverb,
      compThresholdDb: master.compThreshold,
      compRatio: master.compRatio,
      compAttackSeconds: master.compAttack,
      compMix: master.compMix,
      masterVolumeDb: volumeToDb(master.masterVolume),
    },
  });
}

export { snapshotPresetDocument };
