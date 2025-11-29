import { useEffect, useRef, useState } from "react";
import { getContext, getTransport } from "tone";

import { useDebugStore } from "@/features/debug/store/useDebugStore";

interface DebugStats {
  fps: number;
  heapMB: number | null;
  bpm: number;
  transportState: string;
  position: string;
  audioTime: number;
}

export const DebugOverlay = () => {
  const debugMode = useDebugStore((state) => state.debugMode);
  const [stats, setStats] = useState<DebugStats>({
    fps: 0,
    heapMB: null,
    bpm: 0,
    transportState: "stopped",
    position: "0:0:0",
    audioTime: 0,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameRef = useRef<number>(0);

  useEffect(() => {
    if (!debugMode) return;

    let animationId: number;
    lastFrameRef.current = performance.now();

    const updateStats = () => {
      const now = performance.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;

      // Track frame times for FPS calculation
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate FPS from average frame time
      const avgFrameTime =
        frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length;
      const fps = Math.round(1000 / avgFrameTime);

      // Get heap memory (Chrome only)
      let heapMB: number | null = null;
      const perfMemory = (
        performance as unknown as { memory?: { usedJSHeapSize: number } }
      ).memory;
      if (perfMemory) {
        heapMB = Math.round(perfMemory.usedJSHeapSize / 1024 / 1024);
      }

      // Get Tone.js transport info
      const transport = getTransport();
      const bpm = Math.round(transport.bpm.value);
      const transportState = transport.state;
      const position = transport.position.toString().split(".")[0];

      // Get audio context time
      const ctx = getContext();
      const audioTime = Math.round(ctx.currentTime * 10) / 10;

      setStats({ fps, heapMB, bpm, transportState, position, audioTime });
      animationId = requestAnimationFrame(updateStats);
    };

    animationId = requestAnimationFrame(updateStats);

    return () => {
      cancelAnimationFrame(animationId);
      frameTimesRef.current = [];
    };
  }, [debugMode]);

  if (!debugMode) return null;

  return (
    <div className="font-pixel text-primary-foreground fixed top-4 left-4 z-100 rounded bg-black/80 px-3 py-2 text-xs">
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between gap-4">
          <span className="opacity-70">FPS</span>
          <span>{stats.fps}</span>
        </div>
        {stats.heapMB !== null && (
          <div className="flex justify-between gap-4">
            <span className="opacity-70">Heap</span>
            <span>{stats.heapMB} MB</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="opacity-70">BPM</span>
          <span>{stats.bpm}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">State</span>
          <span className="capitalize">{stats.transportState}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Pos</span>
          <span>{stats.position}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Audio</span>
          <span>{stats.audioTime}s</span>
        </div>
      </div>
    </div>
  );
};
