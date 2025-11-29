import { Time } from "tone/build/esm/index";

import type {
  InstrumentData,
  InstrumentRuntime,
} from "@/features/instruments/types/instrument";
import { pitchMapping } from "@/lib/knob/mapping";
import { transformKnobValueExponential } from "@/lib/knob/transform";
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
import { hasAnySolo } from "./solo";
import { triggerInstrumentAtTime } from "./trigger";
import type {
  DrumSequenceStateProvider,
  Ref,
  SequenceInstance,
  SequencerFactory,
} from "./types";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

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
        const pattern = stateProvider.pattern.getPattern();
        const currentRuntimes = instrumentRuntimes.current;

        const { isFirstStep, isLastStep } = getStepBoundaries(step);

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

        // Schedule all voices - same path as offline playback
        schedulePatternStep(
          pattern,
          step,
          Time(time).toSeconds(),
          variationIndex,
          instruments,
          currentRuntimes,
          anySolos,
          hasOhat,
          ohatIndex,
        );

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
 * Checks if step is first or last in the sequence.
 */
function getStepBoundaries(step: number): {
  isFirstStep: boolean;
  isLastStep: boolean;
} {
  return {
    isFirstStep: step === SEQUENCE_EVENTS[0],
    isLastStep: step === SEQUENCE_EVENTS[SEQUENCE_EVENTS.length - 1],
  };
}

/**
 * Schedules all voices in a pattern for a given step.
 * Core scheduling loop shared between live and offline playback.
 */
function schedulePatternStep(
  pattern: Pattern,
  step: number,
  time: number,
  variationIndex: number,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  anySolos: boolean,
  hasOhat: boolean,
  ohatIndex: number,
): void {
  for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
    scheduleVoiceAtTime(
      pattern[voiceIndex],
      step,
      time,
      variationIndex,
      instruments,
      runtimes,
      anySolos,
      hasOhat,
      ohatIndex,
    );
  }
}

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
 *
 * NOTE: This reads PER-NOTE params (pitch, release, solo, mute) from the store
 * on every trigger. CONTINUOUS params (attack, filter, pan, volume) are applied
 * to audio nodes via subscribeRuntimeToInstrumentParams in instrumentParams.ts
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
  // Per-note params: read fresh from store for each trigger
  const pitch = pitchMapping.knobToDomain(params.pitch);
  const releaseTime = transformKnobValueExponential(
    params.release,
    INSTRUMENT_RELEASE_RANGE,
  );

  // Closed hat mutes open hat
  if (inst.role === "hat" && hasOhat) {
    muteOpenHatAtTime(timeSeconds, instruments, runtimes, ohatIndex);
  }

  triggerInstrumentAtTime(runtime, pitch, releaseTime, timeSeconds, velocity);
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

  // Guard against unloaded samplers (can happen during live kit switching)
  if (!runtime.samplerNode.loaded) return;

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

  const ohPitch = pitchMapping.knobToDomain(ohInst.params.pitch);
  ohRuntime.samplerNode.triggerRelease(ohPitch, time);
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
 * Creates a sequence for offline rendering that matches live playback exactly.
 * Uses Tone.js Sequence so transport swing is applied identically.
 * Returns the sequence instance (caller must start transport).
 */
export function createOfflineSequence(
  pattern: Pattern,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
  variationCycle: VariationCycle,
  bars: number,
  sequencerFactory: SequencerFactory = defaultSequencerFactory,
): SequenceInstance {
  const anySolos = hasAnySolo(instruments);
  const { hasOhat, ohatIndex } = findOpenHatIndex(instruments, runtimes);

  let currentBar = 0;
  let currentVariation = computeNextVariationIndex(variationCycle, 0, 0);
  let totalStepsScheduled = 0;
  const totalSteps = bars * STEP_COUNT;

  const sequence = sequencerFactory
    .createSequence(
      (time, step: number) => {
        // Stop scheduling after we've done all bars
        if (totalStepsScheduled >= totalSteps) return;

        const { isFirstStep, isLastStep } = getStepBoundaries(step);

        // Update variation at start of each bar
        if (isFirstStep && totalStepsScheduled > 0) {
          currentBar = computeNextBarIndex(variationCycle, currentBar);
          currentVariation = computeNextVariationIndex(
            variationCycle,
            currentBar,
            currentVariation,
          );
        }

        // Schedule all voices - uses same path as live playback
        schedulePatternStep(
          pattern,
          step,
          Time(time).toSeconds(),
          currentVariation,
          instruments,
          runtimes,
          anySolos,
          hasOhat,
          ohatIndex,
        );

        totalStepsScheduled++;

        // Stop sequence after last step of final bar
        if (isLastStep && totalStepsScheduled >= totalSteps) {
          sequence.stop();
        }
      },
      SEQUENCE_EVENTS,
      SEQUENCE_SUBDIVISION,
    )
    .start(0);

  return sequence;
}
