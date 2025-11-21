import * as Tone from "tone/build/esm/index";

import { transformKnobValueExponential } from "@/components/common/Knob";
import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import type { Voice } from "@/types/pattern";
import type { VariationCycle } from "@/types/preset";
import {
  INSTRUMENT_RELEASE_RANGE,
  SEQUENCE_EVENTS,
  SEQUENCE_SUBDIVISION,
} from "./constants";
import { defaultSequencerFactory, defaultStateProvider } from "./factory";
import { transformPitchKnobToFrequency } from "./pitch";
import { hasAnySolo } from "./solo";
import type {
  DrumSequenceStateProvider,
  Ref,
  SequenceInstance,
  SequencerFactory,
} from "./types";

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

/**
 * Don't forget: make good music
 */
export function createDrumSequence(
  sequencerRef: Ref<SequenceInstance | null>,
  instrumentRuntimes: Ref<InstrumentRuntime[]>,
  variationCycle: VariationCycle,
  currentBar: Ref<number>,
  currentVariation: Ref<number>,
  stateProvider: DrumSequenceStateProvider = defaultStateProvider,
  sequencerFactory: SequencerFactory = defaultSequencerFactory,
): void {
  disposeDrumSequence(sequencerRef);

  sequencerRef.current = sequencerFactory
    .createSequence(
      (time, step: number) => {
        // Grab fresh state every 16th note for responsive UI + audio
        const instruments = stateProvider.instruments.getInstruments();
        const durations = stateProvider.instruments.getDurations();
        const pattern = stateProvider.pattern.getPattern();

        const currentRuntimes = instrumentRuntimes.current;
        const isFirstStep = step === SEQUENCE_EVENTS[0];
        const isLastStep = step === SEQUENCE_EVENTS[SEQUENCE_EVENTS.length - 1];

        const anySolos = hasAnySolo(instruments);
        const { hasOhat, ohatIndex } = findOpenHatIndex(
          instruments,
          currentRuntimes,
        );

        if (isFirstStep) {
          updateVariationForBarStart(
            variationCycle,
            currentBar,
            currentVariation,
            stateProvider,
          );
        }

        const variationIndex = currentVariation.current;

        for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
          const voice = pattern[voiceIndex];
          scheduleVoiceForStep(voice, {
            time: time as Tone.Unit.Time,
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

        stateProvider.transport.setStepIndex(step);

        if (isLastStep) {
          updateBarIndexAtEndOfBar(variationCycle, currentBar);
        }
      },
      SEQUENCE_EVENTS,
      SEQUENCE_SUBDIVISION,
    )
    .start(0);
}

/**
 * Disposes a drum sequence, stopping it first if it's running
 */
export function disposeDrumSequence(
  sequencerRef: Ref<SequenceInstance | null>,
): void {
  if (!sequencerRef.current) return;

  if (sequencerRef.current.state === "started") {
    sequencerRef.current.stop();
  }

  sequencerRef.current.dispose();
  sequencerRef.current = null;
}

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
  const pitch = transformPitchKnobToFrequency(params.pitch);
  const releaseTime = transformKnobValueExponential(
    params.release,
    INSTRUMENT_RELEASE_RANGE,
  );

  if (inst.role === "hat" && hasOhat) {
    muteOpenHat(time, instruments, runtimes, ohatIndex);
  }

  if (inst.role === "ohat") {
    triggerOpenHat(time, runtime, pitch, releaseTime, velocity);
  } else {
    triggerStandardInstrument(time, runtime, pitch, releaseTime, velocity);
  }
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
  currentBar: Ref<number>,
  currentVariation: Ref<number>,
  stateProvider: DrumSequenceStateProvider,
): void {
  const nextVariationIndex = computeNextVariationIndex(
    variationCycle,
    currentBar.current,
    currentVariation.current,
  );
  currentVariation.current = nextVariationIndex;

  const playbackVariation = stateProvider.pattern.getPlaybackVariation();
  if (playbackVariation !== nextVariationIndex) {
    stateProvider.pattern.setPlaybackVariation(nextVariationIndex);
  }
}

function updateBarIndexAtEndOfBar(
  variationCycle: VariationCycle,
  currentBar: Ref<number>,
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

  const ohPitch = transformPitchKnobToFrequency(ohInst.params.pitch);
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
