import React, { useEffect, useRef } from "react";

import { subscribeToPadState } from "@/features/sequencer/lib/padStateManager";
import { cn } from "@/shared/lib/utils";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";

interface SequencerStepProps {
  stepIndex: number;
  variant?: "desktop" | "mobile";
  // Pointer handlers for desktop
  onPointerStart?: (
    event: React.PointerEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onPointerEnter?: (
    event: React.PointerEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  // Touch handlers for mobile (required for iOS Safari)
  onTouchStart?: (
    event: React.TouchEvent<HTMLDivElement>,
    stepIndex: number,
    isTriggerOn: boolean,
  ) => void;
  onTouchMove?: (event: React.TouchEvent<HTMLDivElement>) => void;
}

export const SequencerStep: React.FC<SequencerStepProps> = ({
  stepIndex,
  variant = "desktop",
  onPointerStart,
  onPointerEnter,
  onPointerMove,
  onTouchStart,
  onTouchMove,
}) => {
  const stepRef = useRef<HTMLDivElement>(null);
  const potatoMode = usePerformanceStore((state) => state.potatoMode);

  // Accent beats (every 4th step) for visual emphasis
  const isAccentBeat = stepIndex % 4 === 0;

  // Track trigger state from pad manager
  const [isTriggerOn, setIsTriggerOn] = React.useState(false);

  // Subscribe to pad state manager for all pad state
  useEffect(() => {
    const unsubscribe = subscribeToPadState(stepIndex, (padState) => {
      if (!stepRef.current) return;

      // Update trigger state for event handlers
      setIsTriggerOn(padState.isTriggerOn);

      // Apply brightness (dimming/ghosting)
      if (padState.brightness !== 1) {
        stepRef.current.style.opacity = padState.brightness.toString();
      } else {
        stepRef.current.style.opacity = "";
      }

      // Mobile variant: apply brightness filter when step is playing
      if (variant === "mobile" && padState.isPlaying) {
        stepRef.current.classList.add("brightness-75");
      } else if (variant === "mobile") {
        stepRef.current.classList.remove("brightness-75");
      }
    });

    return unsubscribe;
  }, [stepIndex, variant]);

  const getTriggerClassName = () => {
    if (potatoMode) {
      return isTriggerOn ? "bg-primary" : "bg-instrument";
    }

    return isTriggerOn
      ? "bg-primary shadow-neu hover:primary-muted"
      : variant === "desktop"
        ? "bg-instrument shadow-[0_4px_8px_rgba(176,147,116,0.3)_inset] hover:bg-primary-muted/40"
        : "bg-instrument";
  };

  const triggerStyles = {
    className: getTriggerClassName(),
    opacity: isTriggerOn
      ? 1
      : variant === "mobile" && !isTriggerOn
        ? isAccentBeat
          ? 1
          : 0.75
        : 1,
  };

  const borderRadius =
    variant === "desktop"
      ? "rounded-[0_8px_0_8px] sm:rounded-[0_16px_0_16px]"
      : "";

  const sizeClasses =
    variant === "desktop" ? "aspect-square w-full" : "h-full w-full";

  return (
    <div
      ref={stepRef}
      data-step-index={stepIndex}
      onPointerDown={(event) => onPointerStart?.(event, stepIndex, isTriggerOn)}
      onPointerEnter={(event) =>
        onPointerEnter?.(event, stepIndex, isTriggerOn)
      }
      onPointerMove={(event) => {
        onPointerMove?.(event);
      }}
      onTouchStart={(event) => {
        onTouchStart?.(event, stepIndex, isTriggerOn);
      }}
      onTouchMove={(event) => {
        onTouchMove?.(event);
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "border-border relative cursor-pointer overflow-hidden border",
        potatoMode
          ? "transition-none"
          : "transition-[background-color,box-shadow] duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
      )}
      style={{
        opacity: triggerStyles.opacity,
      }}
    >
      {isTriggerOn && !potatoMode && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_55%)]",
            borderRadius,
          )}
        />
      )}
    </div>
  );
};
