import { getTransport, Sequence, Time } from "tone/build/esm/index";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import {
  InstrumentData,
  InstrumentRuntime,
} from "@/features/instrument/types/instrument";
import { nudgeToBeatOffset } from "@/features/sequencer/lib/timing";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { Pattern, Voice } from "@/features/sequencer/types/pattern";
import { VariationCycle } from "@/features/sequencer/types/sequencer";
import { instrumentDecayMapping, tuneMapping } from "@/shared/knob/lib/mapping";
import {
  SEQUENCE_EVENTS,
  SEQUENCE_SUBDIVISION,
  STEP_COUNT,
  TRANSPORT_SWING_MAX,
  TRANSPORT_SWING_RANGE,
} from "./constants";
import { hasAnySolo } from "./solo";
import { triggerInstrumentAtTime } from "./trigger";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type InstrumentRuntimePair = {
  inst: InstrumentData;
  runtime: InstrumentRuntime;
};

type PrecomputedHit = {
  voice: Voice;
  velocity: number;
};

type PrecomputedPattern = {
  version: number;
  stepsByVariation: PrecomputedHit[][][]; // [variation][step][hits]
};

function buildPrecomputedPattern(
  pattern: Pattern,
  version: number,
): PrecomputedPattern {
  const stepsByVariation: PrecomputedHit[][][] = [
    Array.from({ length: STEP_COUNT }, () => []),
    Array.from({ length: STEP_COUNT }, () => []),
  ];

  for (let voiceIndex = 0; voiceIndex < pattern.length; voiceIndex++) {
    const voice = pattern[voiceIndex];

    for (
      let variationIndex = 0;
      variationIndex < voice.variations.length;
      variationIndex++
    ) {
      const variation = voice.variations[variationIndex];

      for (let step = 0; step < STEP_COUNT; step++) {
        if (!variation.triggers[step]) continue;

        stepsByVariation[variationIndex][step].push({
          voice,
          velocity: variation.velocities[step],
        });
      }
    }
  }

  return {
    version,
    stepsByVariation,
  };
}

// -----------------------------------------------------------------------------
// Public API: sequence lifecycle
// -----------------------------------------------------------------------------

/**
 * Don't forget: make good music
 */
export function createDrumSequence(
  sequencerRef: { current: Sequence | null },
  instrumentRuntimes: { current: InstrumentRuntime[] },
  variationCycle: VariationCycle,
  currentBar: { current: number },
  currentVariation: { current: number },
): void {
  disposeDrumSequence(sequencerRef);

  let precomputedPattern = buildPrecomputedPattern(
    usePatternStore.getState().pattern,
    usePatternStore.getState().patternVersion,
  );

  const sequence = new Sequence(
    (time, step: number) => {
      // Grab fresh state every 16th note for responsive UI + audio
      const instruments = useInstrumentsStore.getState().instruments;
      const currentRuntimes = instrumentRuntimes.current;

      const currentPatternVersion = usePatternStore.getState().patternVersion;
      if (currentPatternVersion !== precomputedPattern.version) {
        precomputedPattern = buildPrecomputedPattern(
          usePatternStore.getState().pattern,
          currentPatternVersion,
        );
      }

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
        );
      }

      const variationIndex = currentVariation.current;

      const hitsForStep =
        precomputedPattern.stepsByVariation[variationIndex][step];

      if (hitsForStep.length > 0) {
        schedulePrecomputedStep(
          hitsForStep,
          step,
          Time(time).toSeconds(),
          variationIndex,
          anySolos,
          hasOhat,
          ohatIndex,
          instruments,
          currentRuntimes,
        );
      }

      if (isLastStep) {
        updateBarIndexAtEndOfBar(variationCycle, currentBar);
      }
    },
    SEQUENCE_EVENTS,
    SEQUENCE_SUBDIVISION,
  );

  sequence.start(0);
  sequencerRef.current = sequence;
}

/**
 * Disposes a drum sequence, stopping it first if it's running.
 */
export function disposeDrumSequence(sequencerRef: {
  current: Sequence | null;
}): void {
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
 * NOTE: This reads PER-NOTE params (tune, decay, solo, mute) from the store
 * on every trigger. CONTINUOUS params (filter, pan, volume) are applied
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
  velocityOverride?: number,
  skipTriggerCheck = false,
): void {
  const params = inst.params;
  const variation = voice.variations[variationIndex];
  const triggers = variation.triggers;
  const velocities = variation.velocities;

  if (!skipTriggerCheck && !triggers[step]) return;
  if ((anySolos && !params.solo) || params.mute) return;

  const velocity = velocityOverride ?? velocities[step];
  // Per-note params: read fresh from store for each trigger
  const tune = tuneMapping.knobToDomain(params.tune);
  const decayTime = instrumentDecayMapping.knobToDomain(params.decay);

  // Apply timing nudge: convert beat offset to seconds based on current BPM
  // Default to 0 for backward compatibility with presets that don't have timingNudge
  const timingNudge = variation.timingNudge ?? 0;
  const beatOffset = nudgeToBeatOffset(timingNudge);
  const bpm = getTransport().bpm.value;
  const secondsPerBeat = 60 / bpm;
  const nudgeSeconds = beatOffset * secondsPerBeat;
  const adjustedTime = timeSeconds + nudgeSeconds;

  // Closed hat mutes open hat
  if (inst.role === "hat" && hasOhat) {
    muteOpenHatAtTime(adjustedTime, instruments, runtimes, ohatIndex);
  }

  triggerInstrumentAtTime(runtime, tune, decayTime, adjustedTime, velocity);
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

function schedulePrecomputedStep(
  hits: PrecomputedHit[],
  step: number,
  timeSeconds: number,
  variationIndex: number,
  anySolos: boolean,
  hasOhat: boolean,
  ohatIndex: number,
  instruments: InstrumentData[],
  runtimes: InstrumentRuntime[],
): void {
  for (let i = 0; i < hits.length; i++) {
    const { voice, velocity } = hits[i];
    const result = getInstrumentAndRuntime(voice, instruments, runtimes);
    if (!result) continue;

    const { inst, runtime } = result;
    if (!runtime.samplerNode.loaded) continue;

    scheduleVoiceCore(
      voice,
      step,
      timeSeconds,
      variationIndex,
      anySolos,
      hasOhat,
      ohatIndex,
      inst,
      runtime,
      instruments,
      runtimes,
      velocity,
      true,
    );
  }
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
  currentBar: { current: number },
  currentVariation: { current: number },
): void {
  const nextVariationIndex = computeNextVariationIndex(
    variationCycle,
    currentBar.current,
    currentVariation.current,
  );

  currentVariation.current = nextVariationIndex;

  const playbackVariation = usePatternStore.getState().playbackVariation;
  if (playbackVariation !== nextVariationIndex) {
    usePatternStore.getState().setPlaybackVariation(nextVariationIndex);
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
  currentBar: { current: number },
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

  const ohTune = tuneMapping.knobToDomain(ohInst.params.tune);
  ohRuntime.samplerNode.triggerRelease(ohTune, time);
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
): Sequence {
  const anySolos = hasAnySolo(instruments);
  const { hasOhat, ohatIndex } = findOpenHatIndex(instruments, runtimes);
  const precomputedPattern = buildPrecomputedPattern(pattern, 0);

  let currentBar = 0;
  let currentVariation = computeNextVariationIndex(variationCycle, 0, 0);
  let totalStepsScheduled = 0;
  const totalSteps = bars * STEP_COUNT;

  const sequence = new Sequence(
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
      const hitsForStep =
        precomputedPattern.stepsByVariation[currentVariation][step];
      if (hitsForStep.length > 0) {
        schedulePrecomputedStep(
          hitsForStep,
          step,
          Time(time).toSeconds(),
          currentVariation,
          anySolos,
          hasOhat,
          ohatIndex,
          instruments,
          runtimes,
        );
      }

      totalStepsScheduled++;

      // Stop sequence after last step of final bar
      if (isLastStep && totalStepsScheduled >= totalSteps) {
        sequence.stop();
      }
    },
    SEQUENCE_EVENTS,
    SEQUENCE_SUBDIVISION,
  );

  sequence.start(0);
  return sequence;
}
