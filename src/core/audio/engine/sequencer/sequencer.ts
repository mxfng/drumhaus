import { getTransport, Sequence, Time } from "tone/build/esm/index";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import {
  clampVariationId,
  sanitizeChain,
} from "@/features/sequencer/lib/chain";
import { nudgeToBeatOffset } from "@/features/sequencer/lib/timing";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { Pattern, Voice } from "@/features/sequencer/types/pattern";
import {
  PatternChain,
  VariationId,
} from "@/features/sequencer/types/sequencer";
import { instrumentDecayMapping, tuneMapping } from "@/shared/knob/lib/mapping";
import {
  SEQUENCE_EVENTS,
  SEQUENCE_SUBDIVISION,
  STEP_COUNT,
} from "../constants";
import { hasAnySolo } from "../instrument/solo";
import {
  getOHatVoiceIndex,
  triggerInstrumentAtTime,
  triggerOHatReleaseAtTime,
} from "../instrument/trigger";
import type { InstrumentData, InstrumentRuntime } from "../instrument/types";
import {
  advanceChainAtEndOfBar,
  ChainPlaybackState,
  getStepBoundaries,
  updatePlaybackVariation,
  updateVariationForBarStart,
} from "../variation/chain";
import { buildPrecomputedPattern, PrecomputedHit } from "./precompute";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Ratchet timing offset in beats (1/32 note).
 * When ratchet is enabled, adds an additional trigger after the main hit.
 * 32nd note = 1/8 of a quarter note = 0.125 beats in 4/4 time
 */
const RATCHET_OFFSET_BEATS = 0.125;

/**
 * Flam timing offset in seconds.
 * Grace note is triggered this many seconds before the main hit (TR-909 style).
 * Creates classic "double stick" flam sound.
 */
const FLAM_OFFSET_SECONDS = 0.015; // 15ms

/**
 * Flam grace note velocity multiplier.
 * Grace note is played at reduced velocity compared to main hit.
 */
const FLAM_GRACE_VELOCITY = 0.6;

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
  sequencerRef: { current: Sequence | null },
  instrumentRuntimes: { current: InstrumentRuntime[] },
  playbackConfig: {
    chain: PatternChain;
    chainEnabled: boolean;
    activeVariation: VariationId;
  },
  currentVariation: { current: number },
): void {
  disposeDrumSequence(sequencerRef);

  let precomputedPattern = buildPrecomputedPattern(
    usePatternStore.getState().pattern,
    usePatternStore.getState().patternVersion,
  );

  const playbackChain = sanitizeChain(playbackConfig.chain);
  const chainState: ChainPlaybackState = {
    stepIndex: 0,
    repeatsRemaining: playbackChain.steps[0]?.repeats ?? 1,
  };
  const fallbackVariation = clampVariationId(playbackConfig.activeVariation);
  const chainEnabled = playbackConfig.chainEnabled;

  updatePlaybackVariation(
    currentVariation,
    chainEnabled
      ? (playbackChain.steps[0]?.variation ?? fallbackVariation)
      : clampVariationId(usePatternStore.getState().variation ?? 0),
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
      const { hasOhat, ohatIndex } = getOHatVoiceIndex(
        instruments,
        currentRuntimes,
      );

      if (isFirstStep) {
        updateVariationForBarStart(
          chainEnabled,
          playbackChain,
          chainState,
          currentVariation,
          fallbackVariation,
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
        advanceChainAtEndOfBar(chainEnabled, playbackChain, chainState);
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
  const ratchets = variation.ratchets ?? [];
  const flams = variation.flams ?? [];

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
    triggerOHatReleaseAtTime(adjustedTime, instruments, runtimes, ohatIndex);
  }

  // Check for flam: trigger grace note before main hit
  const hasFlam = flams[step] ?? false;
  if (hasFlam) {
    const flamGraceTime = adjustedTime - FLAM_OFFSET_SECONDS;
    const flamGraceVelocity = velocity * FLAM_GRACE_VELOCITY;
    triggerInstrumentAtTime(
      runtime,
      tune,
      decayTime,
      flamGraceTime,
      flamGraceVelocity,
    );
  }

  // Main trigger
  triggerInstrumentAtTime(runtime, tune, decayTime, adjustedTime, velocity);

  // Check for ratchet: trigger additional hit after main hit
  const hasRatchet = ratchets[step] ?? false;
  if (hasRatchet) {
    const ratchetOffsetSeconds = RATCHET_OFFSET_BEATS * secondsPerBeat;
    const ratchetTime = adjustedTime + ratchetOffsetSeconds;
    triggerInstrumentAtTime(runtime, tune, decayTime, ratchetTime, velocity);
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
  chain: PatternChain,
  chainEnabled: boolean,
  activeVariation: VariationId,
  bars: number,
): Sequence {
  const anySolos = hasAnySolo(instruments);
  const { hasOhat, ohatIndex } = getOHatVoiceIndex(instruments, runtimes);
  const precomputedPattern = buildPrecomputedPattern(pattern, 0);

  const playbackChain = sanitizeChain(chain);
  const chainState: ChainPlaybackState = {
    stepIndex: 0,
    repeatsRemaining: playbackChain.steps[0]?.repeats ?? 1,
  };

  const chainIsActive = chainEnabled && playbackChain.steps.length > 0;
  let currentVariation = chainIsActive
    ? (playbackChain.steps[0]?.variation ?? clampVariationId(activeVariation))
    : clampVariationId(activeVariation);
  let totalStepsScheduled = 0;
  const totalSteps = bars * STEP_COUNT;

  const sequence = new Sequence(
    (time, step: number) => {
      // Stop scheduling after we've done all bars
      if (totalStepsScheduled >= totalSteps) return;

      const { isFirstStep, isLastStep } = getStepBoundaries(step);

      // Update variation at start of each bar
      if (isFirstStep && totalStepsScheduled > 0) {
        if (chainIsActive) {
          if (chainState.stepIndex >= playbackChain.steps.length) {
            chainState.stepIndex = 0;
            chainState.repeatsRemaining = playbackChain.steps[0]?.repeats ?? 1;
          }
          currentVariation =
            playbackChain.steps[chainState.stepIndex]?.variation ??
            clampVariationId(activeVariation);
        } else {
          currentVariation = clampVariationId(activeVariation);
        }
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

      if (isLastStep && chainIsActive) {
        chainState.repeatsRemaining -= 1;

        if (chainState.repeatsRemaining <= 0) {
          chainState.stepIndex =
            (chainState.stepIndex + 1) %
            Math.max(playbackChain.steps.length, 1);
          chainState.repeatsRemaining =
            playbackChain.steps[chainState.stepIndex]?.repeats ?? 1;
        }
      }
    },
    SEQUENCE_EVENTS,
    SEQUENCE_SUBDIVISION,
  );

  sequence.start(0);
  return sequence;
}
