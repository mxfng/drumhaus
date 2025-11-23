import { Time, type Unit } from "tone/build/esm/index";

import { transformKnobValueExponential } from "@/components/common/knobTransforms";
import type { InstrumentData, InstrumentRuntime } from "@/types/instrument";
import type { Pattern, Voice } from "@/types/pattern";
import type { VariationCycle } from "@/types/preset";
import {
  INSTRUMENT_RELEASE_RANGE,
  SEQUENCE_EVENTS,
  SEQUENCE_SUBDIVISION,
  STEP_COUNT,
  TRANSPORT_SWING_MAX,
  TRANSPORT_SWING_RANGE,
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

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type ScheduleContext = {
  time: Unit.Time;
  step: number;
  variationIndex: number;
  instruments: InstrumentData[];
  durations: number[];
  runtimes: InstrumentRuntime[];
  anySolos: boolean;
  hasOhat: boolean;
  ohatIndex: number;
};

type InstrumentRuntimePair = {
  inst: InstrumentData;
  runtime: InstrumentRuntime;
};

// -----------------------------------------------------------------------------
// Public API: sequence lifecycle
// -----------------------------------------------------------------------------

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
            time: time as Unit.Time,
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
 * Disposes a drum sequence, stopping it first if it's running.
 */
export function disposeDrumSequence(
  sequencerRef: Ref<SequenceInstance | null>,
): void {
  const sequence = sequencerRef.current;
  if (!sequence) return;

  if (sequence.state === "started") {
    sequence.stop();
  }

  sequence.dispose();
  sequencerRef.current = null;
}

// -----------------------------------------------------------------------------
// Core scheduling helpers
// -----------------------------------------------------------------------------

/**
 * Gets the instrument and runtime for a voice, or null if either is missing.
 */
function getInstrumentAndRuntime(
  voice: Voice,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
): InstrumentRuntimePair | null {
  const instrumentIndex = voice.instrumentIndex;
  const inst = instruments[instrumentIndex];
  const runtime = runtimes[instrumentIndex];

  // If the instrument or its runtime is missing (e.g. during a kit switch),
  // skip scheduling for this voice to avoid transient runtime errors.
  if (!inst || !runtime) return null;

  return { inst, runtime };
}

/**
 * Shared core scheduling behavior once we know the instrument + runtime.
 * Used by both online (step-based) and offline (time-based) scheduling.
 */
function scheduleVoiceCore(
  voice: Voice,
  step: number,
  timeSeconds: number,
  variationIndex: number,
  anySolos: boolean,
  hasOhat: boolean,
  ohatIndex: number,
  inst: InstrumentData,
  runtime: InstrumentRuntime,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
): void {
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

  // Closed hat mutes open hat
  if (inst.role === "hat" && hasOhat) {
    muteOpenHatAtTime(timeSeconds, instruments, runtimes, ohatIndex);
  }

  if (inst.role === "ohat") {
    triggerOpenHatAtTime(timeSeconds, runtime, pitch, releaseTime, velocity);
  } else {
    triggerStandardInstrumentAtTime(
      timeSeconds,
      runtime,
      pitch,
      releaseTime,
      velocity,
    );
  }
}

/**
 * Schedules a voice step at a specific time (in seconds).
 * Shared between online and offline playback.
 *
 * NOTE: Public API – signature and behavior preserved.
 */
export function scheduleVoiceAtTime(
  voice: Voice,
  step: number,
  time: number,
  variationIndex: number,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  anySolos: boolean,
  hasOhat: boolean,
  ohatIndex: number,
): void {
  const result = getInstrumentAndRuntime(voice, instruments, runtimes);
  if (!result) return;

  const { inst, runtime } = result;

  scheduleVoiceCore(
    voice,
    step,
    time,
    variationIndex,
    anySolos,
    hasOhat,
    ohatIndex,
    inst,
    runtime,
    instruments,
    runtimes,
  );
}

/**
 * Schedules a voice at a given step within the live sequence callback.
 * Includes sampler-loaded guard, then delegates to scheduleVoiceAtTime.
 */
function scheduleVoiceForStep(voice: Voice, context: ScheduleContext): void {
  const {
    time,
    step,
    variationIndex,
    instruments,
    runtimes,
    anySolos,
    hasOhat,
    ohatIndex,
  } = context;

  const result = getInstrumentAndRuntime(voice, instruments, runtimes);
  if (!result) return;

  const { runtime } = result;

  // Check if sampler is loaded before scheduling (online playback safety)
  if (!runtime.samplerNode.loaded) return;

  scheduleVoiceAtTime(
    voice,
    step,
    Time(time).toSeconds(),
    variationIndex,
    instruments,
    runtimes,
    anySolos,
    hasOhat,
    ohatIndex,
  );
}

// -----------------------------------------------------------------------------
// Variation & bar helpers
// -----------------------------------------------------------------------------

export function computeNextVariationIndex(
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

export function computeNextBarIndex(
  variationCycle: VariationCycle,
  currentBar: number,
): number {
  if (
    variationCycle === "A" ||
    variationCycle === "B" ||
    (variationCycle === "AB" && currentBar > 0) ||
    (variationCycle === "AAAB" && currentBar > 2)
  ) {
    return 0;
  }
  return currentBar + 1;
}

function updateBarIndexAtEndOfBar(
  variationCycle: VariationCycle,
  currentBar: Ref<number>,
): void {
  currentBar.current = computeNextBarIndex(variationCycle, currentBar.current);
}

// -----------------------------------------------------------------------------
// Hat helpers
// -----------------------------------------------------------------------------

export function findOpenHatIndex(
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

export function muteOpenHatAtTime(
  time: number,
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

export function triggerOpenHatAtTime(
  time: number,
  runtime: InstrumentRuntime,
  pitch: number,
  releaseTime: number,
  velocity: number,
): void {
  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(time + releaseTime);
  runtime.samplerNode.triggerAttack(pitch, time, velocity);
}

export function triggerStandardInstrumentAtTime(
  time: number,
  runtime: InstrumentRuntime,
  pitch: number,
  releaseTime: number,
  velocity: number,
): void {
  runtime.samplerNode.triggerRelease(pitch, time);

  const env = runtime.envelopeNode;
  env.triggerAttack(time);
  env.triggerRelease(time + releaseTime);
  runtime.samplerNode.triggerAttack(pitch, time, velocity);
}

// -----------------------------------------------------------------------------
// Transport helpers
// -----------------------------------------------------------------------------

/**
 * Configures transport timing settings.
 * Works with both online (getTransport) and offline transport objects.
 */
export function configureTransportTiming(
  transport: {
    bpm: { value: number };
    swing: number;
    swingSubdivision: string;
  },
  bpm: number,
  swing: number,
): void {
  transport.bpm.value = bpm;
  transport.swing = (swing / TRANSPORT_SWING_RANGE[1]) * TRANSPORT_SWING_MAX;
  transport.swingSubdivision = SEQUENCE_SUBDIVISION;
}

// -----------------------------------------------------------------------------
// Offline scheduling
// -----------------------------------------------------------------------------

/**
 * Schedules all pattern events for offline rendering.
 * Pre-calculates all step times and schedules voices.
 */
export function schedulePatternEvents(
  pattern: Pattern,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  variationCycle: VariationCycle,
  bars: number,
  stepDuration: number,
  swing: number = 0,
): void {
  const totalSteps = bars * STEP_COUNT;
  const anySolos = hasAnySolo(instruments);
  const { hasOhat, ohatIndex } = findOpenHatIndex(instruments, runtimes);

  // Calculate swing delay for odd steps
  // swingSubdivision is "16n", so swing applies to every other 16th note (steps 1, 3, 5, etc.)
  const swingAmount = (swing / TRANSPORT_SWING_RANGE[1]) * TRANSPORT_SWING_MAX;
  // Swing delay is a fraction of the subdivision (16th note = stepDuration)
  const swingDelay = swingAmount * stepDuration;

  let currentBar = 0;
  let currentVariation = computeNextVariationIndex(variationCycle, 0, 0);

  for (let step = 0; step < totalSteps; step++) {
    const stepInBar = step % STEP_COUNT;

    // Apply swing to odd steps
    const isSwingStep = stepInBar % 2 === 1;
    const time = step * stepDuration + (isSwingStep ? swingDelay : 0);

    // Update variation at start of each bar (after the first bar)
    if (stepInBar === 0 && step > 0) {
      currentBar = computeNextBarIndex(variationCycle, currentBar);
      currentVariation = computeNextVariationIndex(
        variationCycle,
        currentBar,
        currentVariation,
      );
    }

    // Schedule each voice
    for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
      scheduleVoiceAtTime(
        pattern[voiceIndex],
        stepInBar,
        time,
        currentVariation,
        instruments,
        runtimes,
        anySolos,
        hasOhat,
        ohatIndex,
      );
    }
  }
}
