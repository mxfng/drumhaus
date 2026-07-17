/**
 * The commit half of the preset pipeline: apply a decoded, migrated,
 * validated preset document to every store in one pass
 * (docs/preset-persistence.md, "The pipeline and its two halves").
 *
 * A plain function over store.getState() actions rather than hook
 * selectors, so it is callable outside React (boot restore, tests).
 *
 * The stores hold canonical units, so this writes the document's values
 * DIRECTLY (V5): no domain->knob crossing. The only shaping is the field
 * renames (decaySeconds -> decay, volumeDb null -> -Infinity, tuneSemitones
 * -> tune) and rehydrating the kit's samples/metadata from the registry.
 *
 * Deliberately not exported from the document barrel (see index.ts): this
 * module pulls in the stores, whose import graph reaches back into
 * @/core/dh and would cycle through the barrel.
 */

import type { MasterChainCanonical } from "@/core/audio/bridge/engine-params";
import { loadKit } from "@/core/dhkit";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import type {
  InstrumentData,
  InstrumentParams,
} from "@/features/instrument/types/instrument";
import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import type { PresetDocument } from "./document";
import { UnknownKitError } from "./errors";

/** null (JSON-safe silence) becomes -Infinity dB in the store. */
function dbFromDocument(volumeDb: number | null): number {
  return volumeDb === null ? -Infinity : volumeDb;
}

function paramsFromChannel(
  channel: PresetDocument["channels"][number],
): InstrumentParams {
  return {
    decay: channel.decaySeconds,
    filter: channel.filter,
    volume: dbFromDocument(channel.volumeDb),
    pan: channel.pan,
    tune: channel.tuneSemitones,
    solo: channel.solo,
    mute: channel.mute,
  };
}

function masterFromDocument(
  master: PresetDocument["master"],
): MasterChainCanonical {
  return {
    filter: master.filter,
    saturation: master.saturation,
    phaser: master.phaser,
    reverb: master.reverb,
    compThreshold: master.compThresholdDb,
    compRatio: master.compRatio,
    compAttack: master.compAttackSeconds,
    compMix: master.compMix,
    masterVolume: dbFromDocument(master.masterVolumeDb),
  };
}

interface ApplyPresetOptions {
  /**
   * How the document reaches the stores.
   *
   * - "load" (default): a user-initiated preset load. Stops playback for
   *   the kit reload, registers custom presets in the library, resets the
   *   variation selection to the chain's entry point, and resets the clean
   *   dirty baseline (a just-loaded preset reads clean).
   * - "restore": an undo/redo step (features/preset/history). Keeps
   *   playback running unless the kit changed, preserves the performance
   *   selection (variation, sequencer mode), and leaves the library and the
   *   clean baseline alone, so dirty detection keeps comparing against the
   *   last real save rather than the restored snapshot.
   */
  intent?: "load" | "restore";
}

/**
 * Commit a preset document to the stores, all-or-nothing.
 *
 * @throws {UnknownKitError} If the document's kit id does not resolve in
 * the registry; nothing has been written when this fires
 */
function applyPresetDocument(
  document: PresetDocument,
  options?: ApplyPresetOptions,
): void {
  const intent = options?.intent ?? "load";
  // Conversion phase: derive every store payload up front (registry kit
  // rehydration plus the document's canonical channel params), so a failure
  // throws before the first store write and the session is untouched.
  const kit = loadKit(document.kit.id);
  if (kit === undefined) {
    throw new UnknownKitError(document.kit.id);
  }

  const instruments: InstrumentData[] = kit.instruments.map(
    (instrument, index) => ({
      ...instrument,
      params: paramsFromChannel(document.channels[index]),
    }),
  );
  const masterChain = masterFromDocument(document.master);

  // Decision 7: the selected A/B/C/D pad is performance state, not preset
  // state; the initial selection derives from the chain's entry point.
  const initialVariation = document.playback.chain.steps[0]?.variation ?? 0;

  const isCustomPreset = !getDefaultPresets().some(
    (preset) => preset.meta.id === document.meta.id,
  );

  // Commit phase: this order is load-bearing - the bridge's push order to
  // the engine depends on it.

  // Stop playback first when committing instruments will kick off the async
  // engine kit reload (samples will reload). A restore with an unchanged kit
  // writes identical descriptors - no reload (see kit-subscription's
  // kitDescriptorsChanged) - so playback keeps running through undo/redo.
  const presetMeta = usePresetMetaStore.getState();
  const kitChanged = presetMeta.currentKitMeta.id !== document.kit.id;
  const transport = useTransportStore.getState();
  if (transport.isPlaying && (intent === "load" || kitChanged)) {
    void transport.togglePlay();
  }

  // Register a non-factory preset in the library (dedupe by id; the entry
  // write is best-effort, see addCustomPreset). A restore never registers:
  // undoing back across a load is not an import.
  if (intent === "load" && isCustomPreset) {
    presetMeta.addCustomPreset(document);
  }

  // Update metadata (the clean dirty baseline is set post-commit below)
  presetMeta.setLoadedPresetMeta(document.meta, kit.meta);

  // Update sequencer. The selection resets are load-only: undo/redo changes
  // the machine's state, not the performer's view (decision in #240).
  const pattern = usePatternStore.getState();
  if (intent === "load") {
    pattern.setVoiceMode(0);
    pattern.setVariation(initialVariation);
  }
  pattern.setPattern(document.pattern);
  pattern.setChain(document.playback.chain);
  pattern.setChainEnabled(document.playback.chainEnabled);

  // Update transport
  transport.setBpm(document.transport.bpm);
  transport.setSwing(document.transport.swing);

  // Update master chain
  useMasterChainStore.getState().setAllMasterChain(masterChain);

  // Update instruments last (triggers the audio engine kit reload)
  useInstrumentsStore.getState().setAllInstruments(instruments);

  // Dirty baseline LAST, from the POST-APPLY snapshot: apply -> snapshot is
  // now an identity round trip (canonical throughout), so a just-applied
  // preset (or restored session) reads clean. Restores skip this: dirty
  // means "differs from the last save", which undo does not change.
  if (intent === "load") {
    presetMeta.markPresetClean();
  }
}

export { applyPresetDocument };
export type { ApplyPresetOptions };
