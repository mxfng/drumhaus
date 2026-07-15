/**
 * The commit half of the preset pipeline: apply a decoded, migrated,
 * validated preset document to every store in one pass
 * (docs/preset-persistence.md, "The pipeline and its two halves").
 *
 * A plain function over store.getState() actions rather than hook
 * selectors, so it is callable outside React (boot restore, tests).
 *
 * Deliberately not exported from the document barrel (see index.ts): this
 * module pulls in the stores, whose import graph reaches back into
 * @/core/dh and would cycle through the barrel.
 */

import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { getDefaultPresets } from "@/features/preset/lib/constants";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import type { PresetDocument } from "./document";
import { documentToV1 } from "./to-v1";

/**
 * Commit a preset document to the stores, all-or-nothing.
 *
 * @throws {UnknownKitError} If the document's kit id does not resolve in
 * the registry; nothing has been written when this fires
 */
function applyPresetDocument(document: PresetDocument): void {
  // Conversion phase: every store payload is derived up front (registry kit
  // rehydration plus the domain-to-knob inverses, all inside documentToV1),
  // so a failure throws before the first store write and the session is
  // untouched.
  //
  // DIRTY-DETECTION INVARIANT: the store payloads and the cleanPreset
  // baseline must all be fields of this ONE documentToV1 result.
  // hasUnsavedChanges() JSON-compares getCurrentPreset() (fresh store
  // reads, knob space) against cleanPreset, so committing a second,
  // separately converted object could differ in float noise and make a
  // just-loaded preset read as dirty.
  const file = documentToV1(document);

  // Decision 7: the selected A/B/C/D pad is performance state, not preset
  // state; the initial selection derives from the chain's entry point.
  const initialVariation = document.playback.chain.steps[0]?.variation ?? 0;

  const isCustomPreset = !getDefaultPresets().some(
    (preset) => preset.meta.id === file.meta.id,
  );

  // Commit phase: the same setters in the same order as the legacy
  // loadPreset; the bridge's push order to the engine depends on it.

  // Stop playback first: committing instruments below kicks off the async
  // engine kit reload (samples will reload).
  const transport = useTransportStore.getState();
  if (transport.isPlaying) {
    void transport.togglePlay();
  }

  // Add to custom presets if not a default preset
  const presetMeta = usePresetMetaStore.getState();
  if (isCustomPreset) {
    presetMeta.addCustomPreset(file);
  }

  // Update metadata (also sets the cleanPreset dirty baseline)
  presetMeta.loadPreset(file);

  // Update sequencer
  const pattern = usePatternStore.getState();
  pattern.setVoiceMode(0);
  pattern.setVariation(initialVariation);
  pattern.setPattern(document.pattern);
  pattern.setChain(document.playback.chain);
  pattern.setChainEnabled(document.playback.chainEnabled);

  // Update transport
  transport.setBpm(file.transport.bpm);
  transport.setSwing(file.transport.swing);

  // Update master chain
  useMasterChainStore.getState().setAllMasterChain(file.masterChain);

  // Update instruments last (triggers the audio engine kit reload)
  useInstrumentsStore.getState().setAllInstruments(file.kit.instruments);
}

export { applyPresetDocument };
