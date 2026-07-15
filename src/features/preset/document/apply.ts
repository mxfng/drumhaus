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

  // Register a non-factory preset in the library (dedupe by id; the entry
  // write is best-effort, see addCustomPreset)
  const presetMeta = usePresetMetaStore.getState();
  if (isCustomPreset) {
    presetMeta.addCustomPreset(document);
  }

  // Update metadata (the clean dirty baseline is set post-commit below)
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

  // Dirty baseline LAST, from the POST-APPLY snapshot rather than the input
  // document: the domain -> knob -> domain crossing leaves float noise the
  // canonical hash's rounding absorbs, and hashing what the stores actually
  // hold guarantees a just-applied preset (or restored session) reads clean.
  presetMeta.markPresetClean();
}

export { applyPresetDocument };
