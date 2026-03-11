import { useEffect, useMemo, useRef } from "react";

import { subscribeToPlaybackAnimation } from "@/shared/lib/animation";
import { cn } from "@/shared/lib/utils";
import { useLightNode, useLightRig } from "@/shared/lightshow";

interface SequencerStepProps {
  index: number; // zero-based position in the grid
  isActive: boolean; // whether the step is currently on/latched
  isGuideHighlighted: boolean; // guide mode: desaturated and slightly darker
  isInCurrentVariation?: boolean; // whether the variation being viewed is the one currently playing
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
  isGuideHighlighted,
  isInCurrentVariation = true,
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
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { isIntroPlaying } = useLightRig();

  useLightNode(buttonRef, {
    id: `sequencer-step-${index}`,
    weight: 0.8,
    group: "sequencer-step",
  });

  // --- Computed styles ---

  const stepContext = useMemo(() => ({ index, isActive }), [index, isActive]);

  const isGuideOnly = isGuideHighlighted && !isActive;
  const isActiveAndVisible = isActive && !isIntroPlaying;
  const isViewingCurrentVariation = isInCurrentVariation;
  const borderRadius = "rounded-[0_16px_0_16px]";
  const sizeClasses = "aspect-square w-full";
  // Preserve chain color overrides by skipping the default active backgrounds when provided
  const activeBackgroundClasses = activeColorClassName
    ? isActiveAndVisible && activeColorClassName
    : [
        "data-[active=true]:bg-primary",
        "data-[active=true]:data-[current-variation=false]:bg-accent",
      ];

  // Use data attributes so Tailwind variants resolve without rapidly swapping class lists
  const triggerClassName = cn(
    "relative overflow-hidden border will-change-[background-color,box-shadow] transition-[background-color,box-shadow] duration-150 ease-out",
    sizeClasses,
    borderRadius,
    // Base
    "bg-secondary shadow-[0_4px_8px_rgba(176,147,116,0.3)_inset] hover:bg-accent/40",
    // Guide-only state
    "data-[guide-only=true]:bg-background data-[guide-only=true]:shadow-[0_4px_8px_rgba(176,147,116,0.35)_inset] data-[guide-only=true]:hover:bg-foreground-muted/90",
    // Active states
    "data-[active=true]:shadow-neu data-[active=true]:hover:accent",
    activeBackgroundClasses,
  );

  // Defer data-attribute writes to the shared animation clock to keep visuals on the same frame budget
  useEffect(() => {
    const el = buttonRef.current;
    if (!el) return;

    let lastActive = "";
    let lastGuideOnly = "";
    let lastVariation = "";

    const unsubscribe = subscribeToPlaybackAnimation(() => {
      if (!el.isConnected) return;

      const nextActive = isActiveAndVisible ? "true" : "false";
      const nextGuideOnly = isGuideOnly ? "true" : "false";
      const nextVariation = isViewingCurrentVariation ? "true" : "false";

      if (nextActive !== lastActive) {
        el.dataset.active = nextActive;
        lastActive = nextActive;
      }
      if (nextGuideOnly !== lastGuideOnly) {
        el.dataset.guideOnly = nextGuideOnly;
        lastGuideOnly = nextGuideOnly;
      }
      if (nextVariation !== lastVariation) {
        el.dataset.currentVariation = nextVariation;
        lastVariation = nextVariation;
      }
    });

    return unsubscribe;
  }, [isActiveAndVisible, isGuideOnly, isViewingCurrentVariation]);

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
      className={triggerClassName}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_55%)]",
          borderRadius,
        )}
      />
    </button>
  );
};
