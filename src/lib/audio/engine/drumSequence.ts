import * as Tone from "tone/build/esm/index";

import { transformKnobValue } from "@/components/common/Knob";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentRuntime } from "@/types/instrument";
import type { VariationCycle } from "@/types/preset";
import { ENGINE_PITCH_RANGE } from "./constants";

const STEPS: number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

/**
 * Disposes a drum sequence, stopping it first if it's running
 */
export function disposeDrumSequence(
  sequencer: React.MutableRefObject<Tone.Sequence<any> | null>,
): void {
  if (sequencer.current) {
    if (sequencer.current.state === "started") {
      sequencer.current.stop();
    }

    sequencer.current.dispose();
    sequencer.current = null;
  }
}

/**
 * Don't forget: make good music
 */
export function createDrumSequence(
  tjsSequencer: React.MutableRefObject<Tone.Sequence<any> | null>,
  instrumentRuntimes: React.MutableRefObject<InstrumentRuntime[]>,
  variationCycle: VariationCycle,
  currentBar: React.MutableRefObject<number>,
  currentVariation: React.MutableRefObject<number>,
) {
  // Dispose existing sequence before creating a new one
  disposeDrumSequence(tjsSequencer);

  tjsSequencer.current = new Tone.Sequence(
    (time, step: number) => {
      // --- Grab fresh state every 16th note (for live response) ---
      const instrumentsState = useInstrumentsStore.getState();
      const patternState = usePatternStore.getState();
      const transportState = useTransportStore.getState();

      const instrumentData = instrumentsState.instruments;
      const durations = instrumentsState.durations;
      const pattern = patternState.pattern;

      // Get current instrument runtimes from ref (may have changed since sequence creation)
      const currentRuntimes = instrumentRuntimes.current;

      const isFirstStep = step === 0;
      const isLastStep = step === 15;

      // --- Determine if any instruments are soloed (cheap small loop) ---
      let anySolos = false;
      for (let i = 0; i < instrumentData.length; i++) {
        if (instrumentData[i].params.solo) {
          anySolos = true;
          break;
        }
      }

      // --- Precompute open hat index (for closed hat muting) ---
      const ohatIndex = instrumentData.findIndex((i) => i.role === "ohat");
      const hasOhat = ohatIndex !== -1 && currentRuntimes[ohatIndex];

      // --- Update variation at the *start* of the bar ---
      if (isFirstStep) {
        let nextVariationIndex = currentVariation.current;

        switch (variationCycle) {
          case "A":
            nextVariationIndex = 0;
            break;
          case "B":
            nextVariationIndex = 1;
            break;
          case "AB":
            nextVariationIndex = currentBar.current === 0 ? 0 : 1;
            break;
          case "AAAB":
            nextVariationIndex = currentBar.current === 3 ? 1 : 0;
            break;
        }

        currentVariation.current = nextVariationIndex;

        // -- Keep UI in sync with current variation
        const { playbackVariation, setPlaybackVariation } =
          usePatternStore.getState();
        if (playbackVariation !== nextVariationIndex) {
          setPlaybackVariation(nextVariationIndex);
        }
      }

      const variationIndex = currentVariation.current;

      // --- Main per-step scheduling loop ---
      for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
        const voice = pattern[voiceIndex];
        const instrumentIndex = voice.instrumentIndex;

        const inst = instrumentData[instrumentIndex];
        const runtime = currentRuntimes[instrumentIndex];

        // If the instrument or its runtime is missing (e.g. during a kit switch),
        // skip scheduling for this voice to avoid transient runtime errors.
        if (!inst || !runtime) continue;

        const params = inst.params;

        const variation = voice.variations[variationIndex];
        const triggers = variation.triggers;
        const velocities = variation.velocities;

        // No hit on this step → skip ASAP
        if (!triggers[step]) continue;

        const isSolo = params.solo;
        const isMuted = params.mute;

        // Solos override everything else
        if (anySolos && !isSolo) continue;
        if (isMuted) continue;

        const velocity = velocities[step];

        // Compute engine values from current knob state (live)
        const pitch = transformKnobValue(params.pitch, ENGINE_PITCH_RANGE);
        const releaseTime = transformKnobValue(params.release, [
          0,
          durations[instrumentIndex],
        ]);

        // Closed-hat mutes open-hat when triggered
        if (inst.role === "hat" && hasOhat) {
          const ohInst = instrumentData[ohatIndex];
          const ohRuntime = currentRuntimes[ohatIndex];
          const ohPitch = transformKnobValue(
            ohInst.params.pitch,
            ENGINE_PITCH_RANGE,
          );
          ohRuntime.samplerNode.triggerRelease(ohPitch, time);
        }

        if (inst.role === "ohat") {
          // --- Open hat behavior ---
          const env = runtime.envelopeNode;
          env.triggerAttack(time);
          env.triggerRelease(time + releaseTime);

          // Check if buffer is loaded before triggering (graceful handling during kit switch)
          if (runtime.samplerNode.loaded) {
            runtime.samplerNode.triggerAttack(pitch, time, velocity);
          }
        } else {
          // --- All other instruments ---
          // Stop any ringing voice at this pitch before re-trigger
          runtime.samplerNode.triggerRelease(pitch, time);

          const env = runtime.envelopeNode;
          env.triggerAttack(time);
          env.triggerRelease(time + releaseTime);

          // Check if buffer is loaded before triggering (graceful handling during kit switch)
          if (runtime.samplerNode.loaded) {
            runtime.samplerNode.triggerAttack(pitch, time, velocity);
          }
        }
      }

      // --- Keep UI in sync with transport ---
      transportState.setStepIndex(step);

      // --- Update bar index at the *end* of the bar ---
      if (isLastStep) {
        if (
          variationCycle === "A" ||
          variationCycle === "B" ||
          (variationCycle === "AB" && currentBar.current > 0) ||
          (variationCycle === "AAAB" && currentBar.current > 2)
        ) {
          currentBar.current = 0;
        } else {
          currentBar.current++;
        }
      }
    },
    STEPS,
    "16n",
  ).start(0);
}
