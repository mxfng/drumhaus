/**
 * Bridge between the instruments store and engine kit loads.
 *
 * Subscribes to the instruments store, pushes descriptor changes into
 * engine.loadKit, and reconciles failures per decision 5 in
 * docs/preset-persistence.md (roll back and notify): when a store-driven
 * kit load fails, the instruments store is rolled back to the previous
 * value - the kit the engine still holds - and a bridge-level
 * kit-load-failure event fires so the UI can toast. The UI never keeps
 * showing a kit the audio does not have.
 *
 * The failure event lives here rather than on the engine because it is a
 * bridge fact, not an engine fact: it means "your kit change was rolled
 * back and the previous kit is still active", which is only true for
 * store-driven loads that this module reconciled. Engine-internal loads
 * (rebuild's reload of the retained kit) fail under different
 * circumstances and must not emit it.
 */

import type {
  KitLoadResult,
  KitSampleDescriptor,
} from "@/core/audio/engine/audio-engine";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import type { InstrumentData } from "@/features/instrument/types/instrument";
import {
  kitDescriptorsChanged,
  toKitSampleDescriptors,
} from "./kit-descriptors";

/**
 * The slice of the engine the kit subscription drives. Structural so tests
 * can exercise the rollback logic against a stub without a real audio graph.
 */
interface KitLoader {
  loadKit(kit: KitSampleDescriptor[]): Promise<KitLoadResult>;
}

// -----------------------------------------------------------------------------
// Kit-load-failure event (bridge-level)
// -----------------------------------------------------------------------------

const failureListeners = new Set<() => void>();

/**
 * Subscribes to kit-load-failure events, fired after a store-driven kit
 * load fails and the instruments store has been rolled back to the kit the
 * engine still holds. Returns an unsubscribe function.
 */
function onKitLoadFailure(listener: () => void): () => void {
  failureListeners.add(listener);
  return () => {
    failureListeners.delete(listener);
  };
}

function emitKitLoadFailure(): void {
  failureListeners.forEach((listener) => listener());
}

// -----------------------------------------------------------------------------
// Store subscription
// -----------------------------------------------------------------------------

/**
 * Subscribes engine kit loads to the instruments store (keyed on the full
 * id / path / role descriptor tuples), loading the current kit immediately
 * and again on every descriptor change. Returns an unsubscribe function.
 *
 * Failure reconciliation: each subscription-driven load is awaited; on
 * "failed" the store rolls back to the value it held before the write
 * (which carries any param edits made since the engine's kit last loaded)
 * and the kit-load-failure event fires. "loaded" and "superseded" change
 * nothing - a superseded load's outcome belongs to the newer load that won.
 *
 * The rollback write re-fires this subscription, so the engine sees a
 * redundant loadKit for the kit it already holds - harmless (last-wins,
 * cached samples). If even that load fails, `rollbackTarget` breaks the
 * loop: a failed load OF the value we just rolled back to is never rolled
 * back again, otherwise two failing kits would ping-pong forever.
 */
function subscribeKitToEngine(engine: KitLoader): () => void {
  let active = true;
  let prevKit = toKitSampleDescriptors(
    useInstrumentsStore.getState().instruments,
  );
  /** The instruments value the last failed load was rolled back to; cleared
   * once any subscription-driven load succeeds. */
  let rollbackTarget: InstrumentData[] | null = null;

  // Initial load: if this fails there is no previous kit to roll back to
  // (the engine holds nothing yet), so failures stay engine-logged only.
  if (prevKit.length > 0) {
    void engine.loadKit(prevKit);
  }

  const unsubscribe = useInstrumentsStore.subscribe((state, prevState) => {
    if (!kitDescriptorsChanged(prevKit, state.instruments)) return;

    const instruments = state.instruments;
    const previousInstruments = prevState.instruments;
    prevKit = toKitSampleDescriptors(instruments);
    if (prevKit.length === 0) return;

    void engine.loadKit(prevKit).then((result) => {
      if (!active) return;
      if (result === "loaded") {
        rollbackTarget = null;
        return;
      }
      if (result !== "failed") return;

      // Loop guard: this failed load IS the rollback we just issued; the
      // engine kept its kit, so a second rollback would only ping-pong.
      if (instruments === rollbackTarget) return;

      rollbackTarget = previousInstruments;
      useInstrumentsStore.getState().setAllInstruments(previousInstruments);
      emitKitLoadFailure();
    });
  });

  return () => {
    active = false;
    unsubscribe();
  };
}

export { onKitLoadFailure, subscribeKitToEngine };
