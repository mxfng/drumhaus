import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { useGrooveStore } from "@/features/groove/store/useGrooveStore";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { SequencerStepIndicator } from "@/features/sequencer/components/SequencerStepIndicator";
import { SequencerVelocity } from "@/features/sequencer/components/SequencerVelocity";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { useLightRig } from "@/shared/lightshow";

interface StepMusicalState {
  velocityValue: number;
  isTriggerOn: boolean;
  brightness: number;
  isGuideActive: boolean;
  color?: string;
  disabled?: boolean;
}

export const Sequencer: React.FC = () => {
  // --- Pattern Store ---
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const mode = usePatternStore((state) => state.mode);
  const chainDraft = usePatternStore((state) => state.chainDraft);
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const toggleAccent = usePatternStore((state) => state.toggleAccent);
  const toggleRatchet = usePatternStore((state) => state.toggleRatchet);
  const toggleFlam = usePatternStore((state) => state.toggleFlam);
  const setVelocity = usePatternStore((state) => state.setVelocity);

  // --- Transport Store ---
  const isPlaying = useTransportStore((state) => state.isPlaying);

  // --- Groove Store ---
  const showVelocity = useGrooveStore((state) => state.showVelocity);

  const isChainEdit = mode.type === "variationChain";
  const accentMode = mode.type === "accent";
  const ratchetMode = mode.type === "ratchet";
  const flamMode = mode.type === "flam";
  const voiceMode = mode.type === "voice";
  const voiceIndex = voiceMode || ratchetMode || flamMode ? mode.voiceIndex : 0;
  const showInstrumentGuide = ratchetMode || flamMode;

  // --- Lightshow ---
  const { isIntroPlaying } = useLightRig();

  // Get appropriate triggers based on mode
  let triggers: boolean[];
  if (accentMode) {
    triggers = pattern.variationMetadata[variation].accent;
  } else if (ratchetMode) {
    triggers = pattern.voices[voiceIndex].variations[variation].ratchets;
  } else if (flamMode) {
    triggers = pattern.voices[voiceIndex].variations[variation].flams;
  } else {
    triggers = pattern.voices[voiceIndex].variations[variation].triggers;
  }

  const instrumentTriggers =
    pattern.voices[voiceIndex].variations[variation].triggers;

  // Calculate ghosting: viewing different variation than what's playing
  const isGhosted = isPlaying && playbackVariation !== variation && !accentMode;

  // --- Step toggle logic ---
  const handleToggleStep = (stepIndex: number) => {
    if (accentMode) {
      toggleAccent(variation, stepIndex);
    } else if (ratchetMode) {
      toggleRatchet(voiceIndex, variation, stepIndex);
    } else if (flamMode) {
      toggleFlam(voiceIndex, variation, stepIndex);
    } else {
      toggleStep(voiceIndex, variation, stepIndex);
    }
  };

  // --- Drag-paint logic ---
  const {
    handleStepPointerStart,
    handleStepPointerMove,
    handleStepPointerEnter,
  } = useSequencerDragPaint({
    triggers,
    onToggleStep: handleToggleStep,
  });

  const currentVariation = pattern.voices[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  // --- Chain Mode Helpers ---
  const variationColors = [
    "bg-variation-a/30 border-variation-a/50", // A
    "bg-variation-b/30 border-variation-b/50", // B
    "bg-variation-c/30 border-variation-c/50", // C
    "bg-variation-d/30 border-variation-d/50", // D
  ];

  const getChainStepVariation = (stepIndex: number): number | null => {
    const totalBars = chainDraft.steps.reduce(
      (sum, step) => sum + step.repeats,
      0,
    );
    const barIndex = Math.floor(stepIndex / 2);

    if (barIndex >= totalBars) {
      return null;
    }

    let currentBar = 0;
    for (const step of chainDraft.steps) {
      if (barIndex < currentBar + step.repeats) {
        return step.variation;
      }
      currentBar += step.repeats;
    }

    return null;
  };

  const getStepMusicalState = (step: number): StepMusicalState => {
    // Chain edit mode: show variation chain visualization
    if (isChainEdit) {
      const chainVariation = getChainStepVariation(step);
      const isEmpty = chainVariation === null;

      return {
        velocityValue: 0,
        isTriggerOn: !isEmpty,
        brightness: 1,
        isGuideActive: false,
        color: !isEmpty ? variationColors[chainVariation] : undefined,
        disabled: true,
      };
    }

    // Normal sequencer mode
    const isTriggerOn = triggers[step];
    const isGuideActive = showInstrumentGuide && instrumentTriggers[step];
    const brightness = isGhosted && (isTriggerOn || isGuideActive) ? 0.7 : 1;

    return {
      velocityValue: velocities[step],
      isTriggerOn,
      brightness,
      isGuideActive,
    };
  };

  return (
    <div
      key="sequence-grid"
      className="sequence-grid grid h-40 w-full grid-cols-16 gap-4 p-6"
      onPointerMove={handleStepPointerMove}
      data-lightshow-lock={isIntroPlaying ? "on" : "off"}
    >
      {steps.map((step) => {
        const state = getStepMusicalState(step);

        return (
          <div key={`sequence-step-item-${step}`} className="col-span-1">
            <SequencerStepIndicator
              stepIndex={step}
              variation={variation}
              playbackVariation={playbackVariation}
            />
            <SequencerStep
              stepIndex={step}
              isTriggerOn={state.isTriggerOn}
              brightness={state.brightness}
              isGuideActive={state.isGuideActive}
              color={state.color}
              disabled={state.disabled}
              onClick={state.disabled ? undefined : handleToggleStep}
              onPointerStart={
                state.disabled ? undefined : handleStepPointerStart
              }
              onPointerEnter={
                state.disabled ? undefined : handleStepPointerEnter
              }
              onPointerMove={state.disabled ? undefined : handleStepPointerMove}
            />
            {/* Hide velocity controls in accent/ratchet/flam/chain mode or when showVelocity is off */}
            <div className="h-3.5 w-full">
              {voiceMode && showVelocity && (
                <SequencerVelocity
                  stepIndex={step}
                  velocityValue={state.velocityValue}
                  isTriggerOn={state.isTriggerOn}
                  onSetVelocity={(stepIndex, velocity) =>
                    setVelocity(voiceIndex, variation, stepIndex, velocity)
                  }
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
