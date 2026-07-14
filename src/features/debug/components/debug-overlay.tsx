import { useEffect, useRef, useState } from "react";

import { getAudioEngine } from "@/core/audio/engine";
import {
  emptyRecoveryCounters,
  getRecoveryStats,
  type RecoveryCounters,
} from "@/core/audio/hooks/recovery-stats";
import { useDebugStore } from "@/features/debug/store/use-debug-store";

interface DebugStats {
  fps: number;
  heapMB: number | null;
  transportState: string;
  position: string;
  audioTime: number;
  audioState: string;
  resumedAgoSeconds: number | null;
  recovery: RecoveryCounters;
}

const DebugOverlay = () => {
  const debugMode = useDebugStore((state) => state.debugMode);
  const [stats, setStats] = useState<DebugStats>({
    fps: 0,
    heapMB: null,
    transportState: "stopped",
    position: "0:0:0",
    audioTime: 0,
    audioState: "unknown",
    resumedAgoSeconds: null,
    recovery: emptyRecoveryCounters(),
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

      // Read-only transport/context diagnostics from the engine
      const diagnostics = getAudioEngine().getDiagnostics();
      const transportState = diagnostics.transportState;
      const position = diagnostics.transportPosition.split(".")[0];
      const audioTime = Math.round(diagnostics.contextTime * 10) / 10;

      const health = diagnostics.contextHealth;
      const resumedAgoSeconds =
        health.lastResume !== null
          ? Math.max((performance.now() - health.lastResume) / 1000, 0)
          : null;

      // Recovery-tier counters persisted by the context guards (issue #319)
      const recovery = getRecoveryStats().counters;

      setStats({
        fps,
        heapMB,
        transportState,
        position,
        audioTime,
        audioState: health.state,
        resumedAgoSeconds,
        recovery,
      });
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
    <div className="font-pixel text-primary-foreground fixed bottom-4 left-4 z-100 rounded bg-black/80 px-3 py-2 text-xs">
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
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Ctx</span>
          <span className="capitalize">{stats.audioState}</span>
        </div>
        {stats.resumedAgoSeconds !== null && (
          <div className="flex justify-between gap-4">
            <span className="opacity-70">Resumed</span>
            <span>{stats.resumedAgoSeconds.toFixed(1)}s ago</span>
          </div>
        )}
        {/* Recovery tiers: success/attempt pairs, then escalation counts */}
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Resume</span>
          <span>
            {stats.recovery.resumeSuccess}/{stats.recovery.resumeAttempt}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Stalls</span>
          <span>{stats.recovery.stallDetected}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Rebuild</span>
          <span>
            {stats.recovery.rebuildSuccess}/{stats.recovery.rebuildAttempt}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Timeouts</span>
          <span>{stats.recovery.rebuildTimeout}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="opacity-70">Reloads</span>
          <span>{stats.recovery.reloadFallback}</span>
        </div>
      </div>
    </div>
  );
};

export { DebugOverlay };
