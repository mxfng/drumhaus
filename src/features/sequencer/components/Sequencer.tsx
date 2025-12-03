import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { useGrooveStore } from "@/features/groove/store/useGrooveStore";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { SequencerStepIndicator } from "@/features/sequencer/components/SequencerStepIndicator";
import { SequencerVelocity } from "@/features/sequencer/components/SequencerVelocity";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";

interface StepMusicalState {
  velocityValue: number;
  isTriggerOn: boolean;
  brightness: number;
  isGuideActive: boolean;
}

export const Sequencer: React.FC = () => {
  // --- Pattern Store ---
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const mode = usePatternStore((state) => state.mode);
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const toggleAccent = usePatternStore((state) => state.toggleAccent);
  const toggleRatchet = usePatternStore((state) => state.toggleRatchet);
  const toggleFlam = usePatternStore((state) => state.toggleFlam);
  const setVelocity = usePatternStore((state) => state.setVelocity);

  // --- Transport Store ---
  const isPlaying = useTransportStore((state) => state.isPlaying);

  // --- Groove Store ---
  const showVelocity = useGrooveStore((state) => state.showVelocity);

  const accentMode = mode.type === "accent";
  const ratchetMode = mode.type === "ratchet";
  const flamMode = mode.type === "flam";
  const voiceIndex =
    mode.type === "voice" || mode.type === "ratchet" || mode.type === "flam"
      ? mode.voiceIndex
      : 0;
  const showInstrumentGuide = ratchetMode || flamMode;

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

  // --- Drag-paint logic ---
  const {
    handleStepPointerStart,
    handleStepPointerMove,
    handleStepPointerEnter,
  } = useSequencerDragPaint({
    triggers,
    onToggleStep: (stepIndex) => {
      if (accentMode) {
        toggleAccent(variation, stepIndex);
      } else if (ratchetMode) {
        toggleRatchet(voiceIndex, variation, stepIndex);
      } else if (flamMode) {
        toggleFlam(voiceIndex, variation, stepIndex);
      } else {
        toggleStep(voiceIndex, variation, stepIndex);
      }
    },
  });

  const currentVariation = pattern.voices[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  const getStepMusicalState = (step: number): StepMusicalState => {
    const isTriggerOn = triggers[step];
    const isGuideActive = showInstrumentGuide && instrumentTriggers[step];
    // Ghosting: 0.7 brightness when trigger (or guide) is on but viewing different variation
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
      className="grid h-40 w-full grid-cols-16 gap-4 p-6"
      onPointerMove={handleStepPointerMove}
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
              onPointerStart={handleStepPointerStart}
              onPointerEnter={handleStepPointerEnter}
              onPointerMove={handleStepPointerMove}
            />
            {/* Hide velocity controls in accent/ratchet/flam mode or when showVelocity is off */}
            <div className="mt-3 h-3.5 w-full">
              {!accentMode && !ratchetMode && !flamMode && showVelocity && (
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
