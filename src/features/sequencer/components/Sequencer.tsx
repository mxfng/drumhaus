import React from "react";

import { STEP_COUNT } from "@/core/audio/engine/constants";
import { useGrooveStore } from "@/features/groove/store/useGrooveStore";
import { SequencerStep } from "@/features/sequencer/components/SequencerStep";
import { SequencerStepIndicator } from "@/features/sequencer/components/SequencerStepIndicator";
import { SequencerVelocity } from "@/features/sequencer/components/SequencerVelocity";
import { useSequencerDragPaint } from "@/features/sequencer/hooks/useSequencerDragPaint";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useLightRig } from "@/shared/lightshow";

// --- Chain Mode Helpers ---
// Note: doubled opacity from other implementations to account for
// the 50% opacity applied due to buttons being disabled in chain mode
const CHAIN_MODE_VARIATION_STEP_COLORS = [
  "bg-variation-a/60 border-variation-a", // A
  "bg-variation-b/60 border-variation-b", // B
  "bg-variation-c/60 border-variation-c", // C
  "bg-variation-d/60 border-variation-d", // D
];

interface StepRenderState {
  velocity: number;
  isActive: boolean;
  isGuideHighlighted: boolean;
  activeColorClassName?: string;
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

  // --- Groove Store ---
  const showVelocity = useGrooveStore((state) => state.showVelocity);

  // --- Mode flags ---
  const isChainEditMode = mode.type === "variationChain";
  const isRatchetMode = mode.type === "ratchet";
  const isFlamMode = mode.type === "flam";
  const isVoiceMode = mode.type === "voice";

  // --- Voice index ---
  const voiceIndex =
    isVoiceMode || isRatchetMode || isFlamMode ? mode.voiceIndex : 0;

  // --- Instrument guide ---
  const showInstrumentGuide = isRatchetMode || isFlamMode;

  // --- Lightshow ---
  const { isIntroPlaying } = useLightRig();

  const currentVariation = pattern.voices[voiceIndex].variations[variation];

  // --- Triggers per mode type ---
  let triggers: boolean[];
  switch (mode.type) {
    case "accent":
      triggers = pattern.variationMetadata[variation].accent;
      break;
    case "ratchet":
      triggers = currentVariation.ratchets;
      break;
    case "flam":
      triggers = currentVariation.flams;
      break;
    default:
      triggers = currentVariation.triggers;
  }

  // Instrument/voice trigger value used for guide state (ratchet, flam)
  const instrumentTriggers = currentVariation.triggers;

  const isViewingCurrentVariation = playbackVariation === variation;

  // --- Velocities ---
  const velocities = currentVariation.velocities;

  const stepIndices: number[] = Array.from({ length: STEP_COUNT }, (_, i) => i);

  // --- Step toggle logic ---
  const handleToggleStep = (stepIndex: number) => {
    switch (mode.type) {
      case "accent":
        toggleAccent(variation, stepIndex);
        return;
      case "ratchet":
        toggleRatchet(voiceIndex, variation, stepIndex);
        return;
      case "flam":
        toggleFlam(voiceIndex, variation, stepIndex);
        return;
      default:
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

  const getStepRenderState = (step: number): StepRenderState => {
    // Chain mode
    if (isChainEditMode) {
      const chainVariation = getChainStepVariation(step);
      const isEmptyStep = chainVariation === null;

      return {
        velocity: 0,
        isActive: !isEmptyStep,
        isGuideHighlighted: false,
        activeColorClassName: !isEmptyStep
          ? CHAIN_MODE_VARIATION_STEP_COLORS[chainVariation]
          : undefined,
      };
    }

    // All other modes
    const isActive = triggers[step];

    // Groove + voice modes: flam,
    const isGuideHighlighted = showInstrumentGuide && instrumentTriggers[step];

    return {
      velocity: velocities[step],
      isActive,
      isGuideHighlighted,
    };
  };

  return (
    <div
      key="sequence-grid"
      className="sequence-grid grid h-40 w-full grid-cols-16 gap-4 p-6"
      onPointerMove={handleStepPointerMove}
      data-lightshow-lock={isIntroPlaying ? "on" : "off"}
    >
      {stepIndices.map((stepIndex) => {
        const state = getStepRenderState(stepIndex);

        return (
          <div key={`sequence-step-item-${stepIndex}`} className="col-span-1">
            <SequencerStepIndicator
              index={stepIndex}
              isInCurrentVariation={isViewingCurrentVariation}
            />
            <SequencerStep
              index={stepIndex}
              isActive={state.isActive}
              isInCurrentVariation={isViewingCurrentVariation}
              isGuideHighlighted={state.isGuideHighlighted}
              activeColorClassName={state.activeColorClassName}
              onKeyboardToggle={handleToggleStep}
              onPointerToggleStart={handleStepPointerStart}
              onPointerToggleEnter={handleStepPointerEnter}
              onPointerMove={handleStepPointerMove}
              disabled={isChainEditMode}
            />
            {/* Hide velocity controls in accent/ratchet/flam/chain mode or when showVelocity is off */}
            <div className="h-3.5 w-full">
              {isVoiceMode && showVelocity && (
                <SequencerVelocity
                  index={stepIndex}
                  value={state.velocity}
                  isActive={state.isActive}
                  onVelocityChange={(targetStep, velocity) =>
                    setVelocity(voiceIndex, variation, targetStep, velocity)
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
