import React from "react";

import { cn } from "@/shared/lib/utils";
import { useLightNode, useLightRig } from "@/shared/lightshow";

interface SequencerStepProps {
  index: number; // zero-based position in the grid
  isActive: boolean; // whether the step is currently on/latched
  intensity: number; // visual intensity (0-1) for ghosted variations
  isGuideHighlighted: boolean; // guide mode: desaturated and slightly darker
  activeColorClassName?: string; // optional className override when active
  disabled?: boolean;
  onKeyboardToggle?: (index: number) => void;
  onPointerToggleStart?: (
    event: React.PointerEvent<HTMLButtonElement>,
    context: { index: number; isActive: boolean },
  ) => void;
  onPointerToggleEnter?: (
    event: React.PointerEvent<HTMLButtonElement>,
    context: { index: number; isActive: boolean },
  ) => void;
  onPointerMove?: (event: React.PointerEvent<HTMLElement>) => void;
  onTouchToggleStart?: (
    event: React.TouchEvent<HTMLButtonElement>,
    context: { index: number; isActive: boolean },
  ) => void;
  onTouchMove?: (event: React.TouchEvent<HTMLButtonElement>) => void;
}

export const SequencerStep: React.FC<SequencerStepProps> = ({
  index,
  isActive,
  intensity = 1,
  isGuideHighlighted,
  activeColorClassName,
  disabled = false,
  onKeyboardToggle,
  onPointerToggleStart,
  onPointerToggleEnter,
  onPointerMove,
  onTouchToggleStart,
  onTouchMove,
}) => {
  // --- Lightshow ---
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  const { isIntroPlaying } = useLightRig();

  useLightNode(buttonRef, {
    id: `sequencer-step-${index}`,
    weight: 0.8,
    group: "sequencer-step",
  });

  // --- Computed styles ---

  const stepContext = React.useMemo(
    () => ({ index, isActive }),
    [index, isActive],
  );

  const isGuideOnly = isGuideHighlighted && !isActive;
  const isActiveAndVisible = isActive && !isIntroPlaying;
  const borderRadius = "rounded-[0_16px_0_16px]";
  const sizeClasses = "aspect-square w-full";

  const triggerClassName =
    (activeColorClassName && isActive && activeColorClassName) ||
    (isActiveAndVisible && "bg-primary shadow-neu hover:accent") ||
    (isGuideOnly &&
      "bg-background shadow-[0_4px_8px_rgba(176,147,116,0.35)_inset] hover:bg-foreground-muted/90") ||
    "bg-secondary shadow-[0_4px_8px_rgba(176,147,116,0.3)_inset] hover:bg-accent/40";

  const triggerStyles = {
    className: triggerClassName,
    opacity: isActive || isGuideOnly ? 1 : 0.75,
  };
  const displayOpacity = intensity !== 1 ? intensity : triggerStyles.opacity;

  // --- Event handlers ---

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (event.detail === 0) {
      onKeyboardToggle?.(index);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onPointerToggleStart?.(event, stepContext);
  };

  const handlePointerEnter = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onPointerToggleEnter?.(event, stepContext);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onPointerMove?.(event);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onTouchToggleStart?.(event, stepContext);
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onTouchMove?.(event);
  };

  return (
    <button
      ref={buttonRef}
      data-step-index={index}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      type="button"
      className={cn(
        "relative overflow-hidden border transition-[background-color,box-shadow,opacity] duration-300 ease-in-out",
        sizeClasses,
        borderRadius,
        triggerStyles.className,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_55%)]",
          borderRadius,
        )}
        style={{
          opacity: displayOpacity,
        }}
      />
    </button>
  );
};
