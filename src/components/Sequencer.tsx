import React, { useEffect, useRef, useState } from "react";

import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";

const STEP_BOXES_GAP = 12;

interface StepMusicalState {
  isTriggerOn: boolean;
  isStepPlaying: boolean;
  isAccentBeat: boolean;
  isAccentPlayingOtherVariation: boolean;
  isGhosted: boolean;
  velocityValue: number;
}

export const Sequencer: React.FC = () => {
  // Get playback state from Transport Store
  const currentStepIndex = useTransportStore((state) => state.stepIndex);
  const isPlaying = useTransportStore((state) => state.isPlaying);

  // Get sequencer state from Sequencer Store
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const triggers = usePatternStore(
    (state) => state.pattern[voiceIndex].variations[variation].triggers,
  );
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const setVelocity = usePatternStore((state) => state.setVelocity);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragWriteTargetOn, setDragWriteTargetOn] = useState<boolean>(true);
  const [isAdjustingVelocity, setIsAdjustingVelocity] =
    useState<boolean>(false);
  const sequencerRef = useRef<HTMLDivElement | null>(null);

  const currentVariation = pattern[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
  const stepHeight = 1538 / STEP_COUNT - STEP_BOXES_GAP;
  const stepRadius = `${stepHeight / 4}px`;
  const steps: number[] = Array.from(
    { length: STEP_COUNT },
    (_, index) => index,
  );

  const updateVelocityFromPointer = (
    event: React.MouseEvent<HTMLDivElement>,
    stepIndex: number,
  ) => {
    const targetDiv = event.currentTarget;
    const rect = targetDiv.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const divWidth = rect.width;
    // Use a small inset to ensure 0 and 100 are reachable at the edges
    const inset = 2;
    const adjustedX = mouseX - inset;
    const adjustedWidth = divWidth - inset * 2;
    const normalizedVelocity = Math.max(
      Math.min(adjustedX / adjustedWidth, 1),
      0,
    );
    setVelocity(voiceIndex, variation, stepIndex, normalizedVelocity);
  };

  const handleVelocityMouseDown = (
    event: React.MouseEvent<HTMLDivElement>,
    stepIndex: number,
  ) => {
    setIsDragging(true);
    setIsAdjustingVelocity(true);
    updateVelocityFromPointer(event, stepIndex);
  };

  const handleVelocityMouseMove = (
    event: React.MouseEvent<HTMLDivElement>,
    stepIndex: number,
  ) => {
    if (isDragging && isAdjustingVelocity) {
      updateVelocityFromPointer(event, stepIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsAdjustingVelocity(false);
  };

  const handleToggleStep = (index: number) => {
    toggleStep(voiceIndex, variation, index);
  };

  const handleStepMouseDown = (stepIndex: number, isCurrentlyOn: boolean) => {
    setIsDragging(true);
    setDragWriteTargetOn(!isCurrentlyOn);
    handleToggleStep(stepIndex);
  };

  const handleStepMouseEnter = (stepIndex: number, isCurrentlyOn: boolean) => {
    const isStateChanging = isCurrentlyOn !== dragWriteTargetOn;
    if (isDragging && isStateChanging && !isAdjustingVelocity) {
      handleToggleStep(stepIndex);
    }
  };

  const getStepMusicalState = (step: number): StepMusicalState => {
    const isTriggerOn = triggers[step];
    const isStepPlaying =
      isPlaying && playbackVariation === variation && currentStepIndex === step;
    const isAccentBeat = step % 4 === 0;
    const isAccentPlayingOtherVariation =
      isPlaying &&
      playbackVariation !== variation &&
      isAccentBeat &&
      currentStepIndex === step;
    const isGhosted =
      isPlaying && playbackVariation !== variation && isTriggerOn;

    return {
      isTriggerOn,
      isStepPlaying,
      isAccentBeat,
      isAccentPlayingOtherVariation,
      isGhosted,
      velocityValue: velocities[step],
    };
  };

  const getIndicatorStyles = (state: StepMusicalState) => {
    const indicatorIsOn =
      state.isStepPlaying || state.isAccentPlayingOtherVariation;

    return {
      className: indicatorIsOn ? "bg-primary" : "bg-foreground",
      opacity: indicatorIsOn ? 1 : state.isAccentBeat ? 0.6 : 0.2,
    };
  };

  const getTriggerStyles = (state: StepMusicalState) => {
    return {
      className: state.isTriggerOn
        ? "bg-primary shadow-[var(--step-shadow-on)] hover:primary-muted"
        : "bg-instrument shadow-step-inset hover:bg-primary-muted/40",
      opacity: state.isGhosted ? 0.7 : 1,
    };
  };

  // Track mouseup events for drag painting step triggers.
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Reset mouse down state when the component unmounts.
  useEffect(() => {
    return () => {
      setIsDragging(false);
    };
  }, []);

  return (
    <div className="w-full" ref={sequencerRef}>
      <div
        key="sequence-grid"
        className="grid h-full w-full"
        style={{
          gridTemplateColumns: `repeat(${STEP_COUNT}, 1fr)`,
          gap: `${STEP_BOXES_GAP}px`,
        }}
      >
        {steps.map((step) => {
          const state = getStepMusicalState(step);
          const indicatorStyles = getIndicatorStyles(state);
          const triggerStyles = getTriggerStyles(state);
          const velocityWidth = Math.max(state.velocityValue * 100, 12);

          return (
            <div key={`sequence-step-item-${step}`} className="col-span-1">
              <div
                key={`sequence-step-indicator-${step}`}
                className={cn("mb-4 h-1 w-full", indicatorStyles.className)}
                style={{ opacity: indicatorStyles.opacity }}
              />
              <div
                key={`sequence-step-trigger-${step}`}
                onMouseDown={() => handleStepMouseDown(step, state.isTriggerOn)}
                onMouseEnter={() =>
                  handleStepMouseEnter(step, state.isTriggerOn)
                }
                onContextMenu={(e) => e.preventDefault()}
                className={cn(
                  "relative w-full cursor-pointer overflow-hidden transition-all duration-300 ease-in-out",
                  triggerStyles.className,
                )}
                style={{
                  height: `${stepHeight}px`,
                  opacity: triggerStyles.opacity,
                  borderRadius: `0 ${stepRadius} 0 ${stepRadius}`,
                }}
              >
                {state.isTriggerOn && (
                  <div
                    key={`sequence-step-trigger-glow-${step}`}
                    className="step-glow pointer-events-none absolute inset-0"
                    style={{ borderRadius: `0 ${stepRadius} 0 ${stepRadius}` }}
                  />
                )}
              </div>
              <div
                key={`sequence-step-velocity-${step}`}
                className={cn(
                  "group outline-primary relative mt-3 h-3.5 w-full rounded-tl-full rounded-br-full bg-transparent outline-1 transition-all duration-200 ease-in-out",
                  state.isTriggerOn
                    ? "cursor-grab"
                    : "pointer-events-none cursor-default",
                )}
                style={{ opacity: state.isTriggerOn ? 0.6 : 0 }}
                onMouseDown={(ev) => handleVelocityMouseDown(ev, step)}
                onMouseMove={(ev) => handleVelocityMouseMove(ev, step)}
              >
                <div
                  className="bg-primary absolute h-full rounded-tl-full rounded-br-full blur-xs"
                  style={{ width: `${velocityWidth}%` }}
                />
                <div className="absolute flex h-full w-full items-center justify-center">
                  <span className="font-pixel text-foreground-emphasis opacity-0 blur-xs transition-all duration-500 ease-in-out group-hover:opacity-100 group-hover:blur-none">
                    {(state.velocityValue * 100).toFixed(0)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
