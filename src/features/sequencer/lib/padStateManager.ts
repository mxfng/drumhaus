import { STEP_COUNT } from "@/core/audio/engine/constants";
import { getCurrentStepFromTransport } from "@/core/audio/engine/transport";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";

/**
 * Pad brightness levels for visual feedback
 * - 0: Off/invisible
 * - 0.7: Dimmed (ghosted)
 * - 1: Full brightness
 */
export type PadBrightness = 0 | 0.7 | 1;

/**
 * Complete state for a single sequencer pad
 */
export interface PadState {
  brightness: PadBrightness;
  isPlaying: boolean; // True when this step is currently being played
  isTriggerOn: boolean; // True when this step has a trigger enabled
}

/**
 * Listener callback for pad state changes
 */
type PadStateListener = (state: PadState) => void;

/**
 * Per-step listener management
 */
interface StepListeners {
  listeners: Set<PadStateListener>;
  lastState: PadState | null;
}

// Listener registry: Map<stepIndex, StepListeners>
const stepListenersMap = new Map<number, StepListeners>();

let animationFrameId: number | null = null;
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / 30; // 30 FPS cap

/**
 * Core state calculation logic
 * Determines pad brightness and playing state based on:
 * - Current mode (voice, accent, copy, paste, etc.)
 * - Musical timing (current step)
 * - Trigger state (on/off)
 * - Variation context (viewing vs playing)
 */
function calculatePadState(stepIndex: number): PadState {
  // Granular selectors for transport state
  const isPlaying = useTransportStore.getState().isPlaying;

  // Granular selectors for pattern state
  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);
  const playbackVariation = usePatternStore((state) => state.playbackVariation);

  const currentStep = isPlaying ? getCurrentStepFromTransport() : -1;
  const isThisStepPlaying = currentStep === stepIndex;

  // Default state
  let brightness: PadBrightness = 1;
  let isTriggerOn = false;

  // Mode-specific logic
  switch (mode.type) {
    case "voice": {
      const voiceIndex = mode.voiceIndex;

      // Granular selector for specific voice variation triggers
      const triggers = usePatternStore(
        (state) =>
          state.pattern.voices[voiceIndex].variations[variation].triggers,
      );
      isTriggerOn = triggers[stepIndex];

      // Ghosting: trigger is on, but we're viewing a different variation than what's playing
      const isGhosted =
        isPlaying && playbackVariation !== variation && isTriggerOn;

      if (isGhosted) {
        brightness = 0.7;
      }
      break;
    }

    case "accent": {
      // Granular selector for accent pattern triggers
      const accentTriggers = usePatternStore(
        (state) => state.pattern.variationMetadata[variation].accent,
      );
      isTriggerOn = accentTriggers[stepIndex];
      // No ghosting in accent mode, always full brightness
      brightness = 1;
      break;
    }

    // Future modes can add their own brightness logic here
    case "copy":
    case "paste":
    case "clear":
    case "random":
    case "variationChain": {
      // Not yet implemented - default to full brightness
      // These modes will have their own trigger display logic
      brightness = 1;
      break;
    }
  }

  return {
    brightness,
    isPlaying: isThisStepPlaying,
    isTriggerOn,
  };
}

/**
 * Main animation frame tick
 * Calculates state for all subscribed pads and notifies listeners only when state changes
 */
function tick(now: number) {
  if (now - lastFrameTime >= FRAME_INTERVAL) {
    lastFrameTime = now;

    // Calculate and emit state for each subscribed step
    stepListenersMap.forEach((stepData, stepIndex) => {
      const newState = calculatePadState(stepIndex);
      const { lastState } = stepData;

      // Only notify if state actually changed
      if (
        !lastState ||
        lastState.brightness !== newState.brightness ||
        lastState.isPlaying !== newState.isPlaying ||
        lastState.isTriggerOn !== newState.isTriggerOn
      ) {
        stepData.lastState = newState;
        stepData.listeners.forEach((listener) => listener(newState));
      }
    });
  }

  animationFrameId = requestAnimationFrame(tick);
}

/**
 * Ensure the animation frame ticker is running
 */
function ensureTickerRunning(): void {
  if (animationFrameId !== null) return;
  lastFrameTime = 0;
  animationFrameId = requestAnimationFrame(tick);
}

/**
 * Stop the ticker if no listeners remain
 */
function stopTickerIfIdle(): void {
  if (stepListenersMap.size === 0 && animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    lastFrameTime = 0;
  }
}

/**
 * Subscribe to state changes for a specific pad
 *
 * @param stepIndex - The step index (0-15) to subscribe to
 * @param listener - Callback invoked when pad state changes
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = subscribeToPadState(0, (state) => {
 *   element.style.opacity = state.brightness.toString();
 * });
 * ```
 */
export function subscribeToPadState(
  stepIndex: number,
  listener: PadStateListener,
): () => void {
  // Validate step index
  if (stepIndex < 0 || stepIndex >= STEP_COUNT) {
    console.warn(`Invalid step index: ${stepIndex}`);
    return () => {};
  }

  // Get or create listener set for this step
  let stepData = stepListenersMap.get(stepIndex);
  if (!stepData) {
    stepData = {
      listeners: new Set(),
      lastState: null,
    };
    stepListenersMap.set(stepIndex, stepData);
  }

  stepData.listeners.add(listener);
  ensureTickerRunning();

  // Immediately invoke with current state
  const initialState = calculatePadState(stepIndex);
  stepData.lastState = initialState;
  listener(initialState);

  // Return unsubscribe function
  return () => {
    const data = stepListenersMap.get(stepIndex);
    if (data) {
      data.listeners.delete(listener);
      if (data.listeners.size === 0) {
        stepListenersMap.delete(stepIndex);
      }
    }
    stopTickerIfIdle();
  };
}

/**
 * Force recalculation of all pad states
 * Useful when mode changes or other non-temporal state updates occur
 */
export function invalidateAllPadStates(): void {
  stepListenersMap.forEach((stepData, stepIndex) => {
    const newState = calculatePadState(stepIndex);
    stepData.lastState = newState;
    stepData.listeners.forEach((listener) => listener(newState));
  });
}
