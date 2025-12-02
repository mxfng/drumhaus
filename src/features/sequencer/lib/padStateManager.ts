import { STEP_COUNT } from "@/core/audio/engine/constants";
import { getCurrentStepFromTransport } from "@/core/audio/engine/transport";
import { subscribeToPlaybackAnimation } from "@/core/audio/lib/playbackAnimationManager";
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

let unsubscribePlaybackAnimation: (() => void) | null = null;
let unsubscribePatternStore: (() => void) | null = null;

/**
 * Core state calculation logic
 * Determines pad brightness and playing state based on:
 * - Current mode (voice, accent, copy, paste, etc.)
 * - Musical timing (current step)
 * - Trigger state (on/off)
 * - Variation context (viewing vs playing)
 */
function calculatePadState(stepIndex: number): PadState {
  // Get current state from stores
  const transportState = useTransportStore.getState();
  const patternState = usePatternStore.getState();

  const isPlaying = transportState.isPlaying;
  const mode = patternState.mode;
  const variation = patternState.variation;
  const playbackVariation = patternState.playbackVariation;

  const currentStep = isPlaying ? getCurrentStepFromTransport() : -1;
  const isThisStepPlaying = currentStep === stepIndex;

  // Default state
  let brightness: PadBrightness = 1;
  let isTriggerOn = false;

  // Mode-specific logic
  switch (mode.type) {
    case "voice": {
      const voiceIndex = mode.voiceIndex;

      // Get trigger state for this step
      const triggers =
        patternState.pattern.voices[voiceIndex].variations[variation].triggers;
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
      // Get accent trigger state for this step
      const accentTriggers =
        patternState.pattern.variationMetadata[variation].accent;
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
 * Update all subscribed pads
 * Called during playback (for timing) and on pattern changes (for triggers)
 */
function updateAllPads(): void {
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

/**
 * Start subscriptions to playback animation and pattern changes
 */
function startSubscriptions(): void {
  // Subscribe to playback animation (only runs when playing)
  if (unsubscribePlaybackAnimation === null) {
    unsubscribePlaybackAnimation = subscribeToPlaybackAnimation(() => {
      updateAllPads();
    });
  }

  // Subscribe to pattern store changes (runs when paused for instant updates)
  if (unsubscribePatternStore === null) {
    unsubscribePatternStore = usePatternStore.subscribe(() => {
      // Only update when NOT playing (playback animation handles playing state)
      const isPlaying = useTransportStore.getState().isPlaying;
      if (!isPlaying) {
        updateAllPads();
      }
    });
  }
}

/**
 * Stop subscriptions if no listeners remain
 */
function stopSubscriptionsIfIdle(): void {
  if (stepListenersMap.size === 0) {
    if (unsubscribePlaybackAnimation) {
      unsubscribePlaybackAnimation();
      unsubscribePlaybackAnimation = null;
    }
    if (unsubscribePatternStore) {
      unsubscribePatternStore();
      unsubscribePatternStore = null;
    }
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
  startSubscriptions();

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
    stopSubscriptionsIfIdle();
  };
}

/**
 * Force recalculation of all pad states
 * Useful when mode changes or other non-temporal state updates occur
 */
export function invalidateAllPadStates(): void {
  updateAllPads();
}
