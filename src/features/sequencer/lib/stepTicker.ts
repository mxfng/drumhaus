import { getCurrentStepFromTransport } from "@/core/audio/engine/transport";
import { useTransportStore } from "@/features/transport/store/useTransportStore";

type StepListener = (payload: {
  currentStep: number;
  isPlaying: boolean;
}) => void;

const listeners = new Set<StepListener>();

let animationFrameId: number | null = null;
let lastStep = -2; // Force an initial emit (-1 is "not playing")
let lastIsPlaying: boolean | null = null;
let lastFrameTime = 0;
const FRAME_INTERVAL = 1000 / 30; // 30 FPS cap

const tick = (now: number) => {
  if (now - lastFrameTime >= FRAME_INTERVAL) {
    lastFrameTime = now;

    const { isPlaying } = useTransportStore.getState();
    const currentStep = isPlaying ? getCurrentStepFromTransport() : -1;

    // Only notify listeners when something actually changed
    if (currentStep !== lastStep || isPlaying !== lastIsPlaying) {
      lastStep = currentStep;
      lastIsPlaying = isPlaying;
      listeners.forEach((listener) => listener({ currentStep, isPlaying }));
    }
  }

  animationFrameId = requestAnimationFrame(tick);
};

function ensureTickerRunning(): void {
  if (animationFrameId !== null) return;
  lastFrameTime = 0;
  animationFrameId = requestAnimationFrame(tick);
}

function stopTickerIfIdle(): void {
  if (listeners.size === 0 && animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
    lastStep = -2;
    lastIsPlaying = null;
    lastFrameTime = 0;
  }
}

export function subscribeToStepUpdates(listener: StepListener): () => void {
  listeners.add(listener);
  ensureTickerRunning();

  return () => {
    listeners.delete(listener);
    stopTickerIfIdle();
  };
}
