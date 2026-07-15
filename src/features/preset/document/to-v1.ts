/**
 * Compatibility adapter: PresetDocument -> PresetFileV1.
 *
 * Lets v2 documents flow through today's loadPreset (which consumes
 * PresetFileV1) until PR 3 replaces it with apply(document). Unlike
 * migrate-v1.ts, which freezes the v1 curves permanently, this adapter
 * targets today's app and reuses the live inverse mappings
 * (src/core/audio/bridge/domain-to-knob.ts).
 *
 * Knob values are left continuous (unrounded): the stores hold unrounded
 * floats today - bundled .dh files contain values like compRatio
 * 57.14285714285714 and tune 45.833333333333336 - and domain-to-knob.ts
 * deliberately leaves quantization to the caller, so rounding here would
 * lose precision the stores keep.
 */

import {
  compRatioDomainToKnob,
  instrumentVolumeDomainToKnob,
  masterVolumeDomainToKnob,
  splitFilterPositionToKnob,
  transportSwingDomainToKnob,
} from "@/core/audio/bridge/domain-to-knob";
import type { MasterChainParams } from "@/core/audio/bridge/knob-to-domain";
import { INSTRUMENT_TUNE_SEMITONE_RANGE } from "@/core/audio/engine/constants";
import { loadKit } from "@/core/dhkit";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import type { PresetFileV1 } from "@/features/preset/types/preset";
import {
  compAttackMapping,
  compMixMapping,
  compThresholdMapping,
  instrumentDecayMapping,
  instrumentPanMapping,
  phaserWetMapping,
  reverbWetMapping,
  saturationWetMapping,
} from "@/shared/knob/lib/mapping";
import { clamp } from "@/shared/lib/utils";
import type { PresetDocument } from "./document";
import { UnknownKitError } from "./errors";
import { PRESET_FILE_VERSION } from "./migrate";

type Channel = PresetDocument["channels"][number];

/**
 * Inverse of the migration's tuneSemitones: straight knob geometry rather
 * than a round trip through the bridge's Hz representation, so the semitone
 * offset survives exactly.
 */
function tuneSemitonesToKnob(tuneSemitones: number): number {
  return clamp(
    (tuneSemitones / INSTRUMENT_TUNE_SEMITONE_RANGE) * 50 + 50,
    0,
    100,
  );
}

function instrumentFromChannel(
  instrument: InstrumentData,
  channel: Channel,
): InstrumentData {
  return {
    meta: instrument.meta,
    role: instrument.role,
    sample: instrument.sample,
    params: {
      decay: instrumentDecayMapping.domainToKnob(channel.decaySeconds),
      filter: splitFilterPositionToKnob(channel.filter),
      volume: instrumentVolumeDomainToKnob(channel.volumeDb),
      pan: instrumentPanMapping.domainToKnob(channel.pan),
      tune: tuneSemitonesToKnob(channel.tuneSemitones),
      solo: channel.solo,
      mute: channel.mute,
    },
  };
}

function masterChainFromDocument(
  master: PresetDocument["master"],
): MasterChainParams {
  return {
    filter: splitFilterPositionToKnob(master.filter),
    // Macro amounts are the wet fraction, so the wet mapping's inverse is
    // the macro inverse (knob = amount * 100).
    saturation: saturationWetMapping.domainToKnob(master.saturation),
    phaser: phaserWetMapping.domainToKnob(master.phaser),
    reverb: reverbWetMapping.domainToKnob(master.reverb),
    compThreshold: compThresholdMapping.domainToKnob(master.compThresholdDb),
    compRatio: compRatioDomainToKnob(master.compRatio),
    compAttack: compAttackMapping.domainToKnob(master.compAttackSeconds),
    compMix: compMixMapping.domainToKnob(master.compMix),
    masterVolume: masterVolumeDomainToKnob(master.masterVolumeDb),
  };
}

/**
 * Convert a v2 preset document to the v1 file shape today's loadPreset
 * consumes. The kit is rehydrated from the registry by id; only the
 * document's channel params overwrite the registry instruments.
 *
 * @throws {UnknownKitError} If the document's kit id does not resolve in
 * the registry
 */
function documentToV1(document: PresetDocument): PresetFileV1 {
  const kit = loadKit(document.kit.id);
  if (kit === undefined) {
    throw new UnknownKitError(document.kit.id);
  }

  return {
    kind: "drumhaus.preset",
    version: PRESET_FILE_VERSION,
    meta: {
      id: document.meta.id,
      name: document.meta.name,
      createdAt: document.meta.createdAt,
      updatedAt: document.meta.updatedAt,
      ...(document.meta.author !== undefined
        ? { author: document.meta.author }
        : {}),
    },
    kit: {
      kind: kit.kind,
      version: kit.version,
      meta: kit.meta,
      instruments: kit.instruments.map((instrument, index) =>
        instrumentFromChannel(instrument, document.channels[index]),
      ),
    },
    transport: {
      bpm: document.transport.bpm,
      swing: transportSwingDomainToKnob(document.transport.swing),
    },
    sequencer: {
      pattern: document.pattern,
      chain: document.playback.chain,
      chainEnabled: document.playback.chainEnabled,
    },
    masterChain: masterChainFromDocument(document.master),
  };
}

export { documentToV1 };
