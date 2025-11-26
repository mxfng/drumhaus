import React, { useEffect, useRef, useState } from "react";

import { StepIndicator } from "@/components/StepIndicator";
import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { clampVelocity } from "@/lib/pattern/helpers";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";
import { useTransportStore } from "@/stores/useTransportStore";

interface StepMusicalState {
  isTriggerOn: boolean;
  isGhosted: boolean;
  velocityValue: number;
}

export const Sequencer: React.FC = () => {
  // --- Transport Store ---
  const isPlaying = useTransportStore((state) => state.isPlaying);

  // --- Pattern Store ---
  const pattern = usePatternStore((state) => state.pattern);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const triggers = usePatternStore(
    (state) => state.pattern[voiceIndex].variations[variation].triggers,
  );
  const toggleStep = usePatternStore((state) => state.toggleStep);
  const setVelocity = usePatternStore((state) => state.setVelocity);

  // --- State ---
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragWriteTargetOn, setDragWriteTargetOn] = useState<boolean>(true);
  const [isAdjustingVelocity, setIsAdjustingVelocity] =
    useState<boolean>(false);

  const sequencerRef = useRef<HTMLDivElement | null>(null);

  const currentVariation = pattern[voiceIndex].variations[variation];
  const velocities = currentVariation.velocities;
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
    const velocity = clampVelocity(adjustedX / adjustedWidth);
    setVelocity(voiceIndex, variation, stepIndex, velocity);
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
    const isGhosted =
      isPlaying && playbackVariation !== variation && isTriggerOn;

    return {
      isTriggerOn,
      isGhosted,
      velocityValue: velocities[step],
    };
  };

  const getTriggerStyles = (state: StepMusicalState) => {
    return {
      className: state.isTriggerOn
        ? "bg-primary shadow-neu hover:primary-muted"
        : "bg-instrument shadow-[0_4px_8px_rgba(176,147,116,1)_inset] hover:bg-primary-muted/40",
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
    <div className="w-full py-2 sm:py-0" ref={sequencerRef}>
      <div
        key="sequence-grid"
        className="grid h-full w-full grid-cols-8 gap-x-1 gap-y-3 sm:grid-cols-16 sm:gap-3"
      >
        {steps.map((step) => {
          const state = getStepMusicalState(step);
          const triggerStyles = getTriggerStyles(state);
          const velocityWidth = Math.max(state.velocityValue * 100, 12);

          return (
            <div key={`sequence-step-item-${step}`} className="col-span-1">
              <StepIndicator
                stepIndex={step}
                variation={variation}
                playbackVariation={playbackVariation}
              />
              <div
                key={`sequence-step-trigger-${step}`}
                onMouseDown={() => handleStepMouseDown(step, state.isTriggerOn)}
                onMouseEnter={() =>
                  handleStepMouseEnter(step, state.isTriggerOn)
                }
                onContextMenu={(e) => e.preventDefault()}
                className={cn(
                  "relative aspect-square w-full cursor-pointer overflow-hidden transition-all duration-300 ease-in-out",
                  "rounded-[0_8px_0_8px] sm:rounded-[0_22px_0_22px]",
                  triggerStyles.className,
                )}
                style={{
                  opacity: triggerStyles.opacity,
                }}
              >
                {state.isTriggerOn && (
                  <div
                    key={`sequence-step-trigger-glow-${step}`}
                    className="pointer-events-none absolute inset-0 rounded-[0_8px_0_8px] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_55%)] sm:rounded-[0_22px_0_22px]"
                  />
                )}
              </div>
              <div
                key={`sequence-step-velocity-${step}`}
                className={cn(
                  "group outline-primary relative mt-2 h-4 w-full overflow-hidden rounded-[200px_0_200px_0] bg-transparent outline-1 transition-all duration-200 ease-in-out sm:mt-3 sm:h-3.5",
                  "hidden sm:block",
                  state.isTriggerOn
                    ? "cursor-grab"
                    : "pointer-events-none cursor-default",
                )}
                style={{ opacity: state.isTriggerOn ? 0.6 : 0 }}
                onMouseDown={(ev) => handleVelocityMouseDown(ev, step)}
                onMouseMove={(ev) => handleVelocityMouseMove(ev, step)}
              >
                <div
                  className="bg-primary absolute h-full rounded-[200px_0_200px_0] blur-xs"
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
