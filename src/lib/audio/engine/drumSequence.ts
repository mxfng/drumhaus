import * as Tone from "tone/build/esm/index";

import { transformKnobValue } from "@/components/common/Knob";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";
import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import type { Voice } from "@/types/pattern";
import type { VariationCycle } from "@/types/preset";
import {
  ENGINE_PITCH_RANGE,
  SEQUENCE_EVENTS,
  SEQUENCE_SUBDIVISION,
} from "./constants";

function hasAnySolo(instruments: InstrumentData[]): boolean {
  for (let i = 0; i < instruments.length; i++) {
    if (instruments[i].params.solo) return true;
  }
  return false;
}

function findOpenHatIndex(
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
): { hasOhat: boolean; ohatIndex: number } {
  const ohatIndex = instruments.findIndex(
    (instrument) => instrument.role === "ohat",
  );
  return {
    hasOhat: ohatIndex !== -1 && Boolean(runtimes[ohatIndex]),
    ohatIndex,
  };
}

function computeNextVariationIndex(
  variationCycle: VariationCycle,
  currentBarIndex: number,
  currentVariationIndex: number,
): number {
  switch (variationCycle) {
    case "A":
      return 0;
    case "B":
      return 1;
    case "AB":
      return currentBarIndex === 0 ? 0 : 1;
    case "AAAB":
      return currentBarIndex === 3 ? 1 : 0;
    default:
      return currentVariationIndex;
  }
}

function updateVariationForBarStart(
  variationCycle: VariationCycle,
  currentBar: React.MutableRefObject<number>,
  currentVariation: React.MutableRefObject<number>,
): void {
  const nextVariationIndex = computeNextVariationIndex(
    variationCycle,
    currentBar.current,
    currentVariation.current,
  );
  currentVariation.current = nextVariationIndex;

  const { playbackVariation, setPlaybackVariation } =
    usePatternStore.getState();
  if (playbackVariation !== nextVariationIndex) {
    setPlaybackVariation(nextVariationIndex);
  }
}

function updateBarIndexAtEndOfBar(
  variationCycle: VariationCycle,
  currentBar: React.MutableRefObject<number>,
): void {
  if (
    variationCycle === "A" ||
    variationCycle === "B" ||
    (variationCycle === "AB" && currentBar.current > 0) ||
    (variationCycle === "AAAB" && currentBar.current > 2)
  ) {
    currentBar.current = 0;
  } else {
    currentBar.current += 1;
  }
}

function muteOpenHat(
  time: Tone.Unit.Time,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  ohatIndex: number,
): void {
  const ohInst = instruments[ohatIndex];
  const ohRuntime = runtimes[ohatIndex];
  if (!ohInst || !ohRuntime) return;

  const ohPitch = transformKnobValue(ohInst.params.pitch, ENGINE_PITCH_RANGE);
  ohRuntime.samplerNode.triggerRelease(ohPitch, time);
}

function triggerOpenHat(
  time: Tone.Unit.Time,
  runtime: InstrumentRuntime,
  pitch: number,
  releaseTime: number,
  velocity: number,
): void {
  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(Tone.Time(time).toSeconds() + releaseTime);

  if (runtime.samplerNode.loaded) {
    runtime.samplerNode.triggerAttack(pitch, time, velocity);
  }
}

function triggerStandardInstrument(
  time: Tone.Unit.Time,
  runtime: InstrumentRuntime,
  pitch: number,
  releaseTime: number,
  velocity: number,
): void {
  runtime.samplerNode.triggerRelease(pitch, time);

  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(Tone.Time(time).toSeconds() + releaseTime);

  if (runtime.samplerNode.loaded) {
    runtime.samplerNode.triggerAttack(pitch, time, velocity);
  }
}

type ScheduleContext = {
  time: Tone.Unit.Time;
  step: number;
  variationIndex: number;
  instruments: InstrumentData[];
  durations: number[];
  runtimes: InstrumentRuntime[];
  anySolos: boolean;
  hasOhat: boolean;
  ohatIndex: number;
};

function scheduleVoiceForStep(voice: Voice, context: ScheduleContext): void {
  const {
    time,
    step,
    variationIndex,
    instruments,
    durations,
    runtimes,
    anySolos,
    hasOhat,
    ohatIndex,
  } = context;

  const instrumentIndex = voice.instrumentIndex;
  const inst = instruments[instrumentIndex];
  const runtime = runtimes[instrumentIndex];

  // If the instrument or its runtime is missing (e.g. during a kit switch),
  // skip scheduling for this voice to avoid transient runtime errors.
  if (!inst || !runtime) return;

  const params = inst.params;
  const variation = voice.variations[variationIndex];
  const triggers = variation.triggers;
  const velocities = variation.velocities;

  if (!triggers[step]) return;

  if ((anySolos && !params.solo) || params.mute) return;

  const velocity = velocities[step];
  const pitch = transformKnobValue(params.pitch, ENGINE_PITCH_RANGE);
  const releaseTime = transformKnobValue(params.release, [
    0,
    durations[instrumentIndex],
  ]);

  if (inst.role === "hat" && hasOhat) {
    muteOpenHat(time, instruments, runtimes, ohatIndex);
  }

  if (inst.role === "ohat") {
    triggerOpenHat(time, runtime, pitch, releaseTime, velocity);
  } else {
    triggerStandardInstrument(time, runtime, pitch, releaseTime, velocity);
  }
}

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
      const { instruments, durations } = useInstrumentsStore.getState();
      const { pattern } = usePatternStore.getState();
      const { setStepIndex } = useTransportStore.getState();

      // Get current instrument runtimes from ref (may have changed since sequence creation)
      const currentRuntimes = instrumentRuntimes.current;

      const isFirstStep = step === SEQUENCE_EVENTS[0];
      const isLastStep = step === SEQUENCE_EVENTS[SEQUENCE_EVENTS.length - 1];

      // --- Determine if any instruments are soloed (cheap small loop) ---
      const anySolos = hasAnySolo(instruments);

      // --- Precompute open hat index (for closed hat muting) ---
      const { hasOhat, ohatIndex } = findOpenHatIndex(
        instruments,
        currentRuntimes,
      );

      // --- Update variation at the *start* of the bar ---
      if (isFirstStep) {
        updateVariationForBarStart(
          variationCycle,
          currentBar,
          currentVariation,
        );
      }

      const variationIndex = currentVariation.current;

      // --- Main per-step scheduling loop ---
      for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
        const voice = pattern[voiceIndex];
        scheduleVoiceForStep(voice, {
          time,
          step,
          variationIndex,
          instruments,
          durations,
          runtimes: currentRuntimes,
          anySolos,
          hasOhat,
          ohatIndex,
        });
      }

      // --- Keep UI in sync with transport ---
      setStepIndex(step);

      // --- Update bar index at the *end* of the bar ---
      if (isLastStep) {
        updateBarIndexAtEndOfBar(variationCycle, currentBar);
      }
    },
    SEQUENCE_EVENTS,
    SEQUENCE_SUBDIVISION,
  ).start(0);
}
