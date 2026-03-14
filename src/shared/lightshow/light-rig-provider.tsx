import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  LightRigContext,
  type LightRigContextValue,
} from "./light-rig-context";
import { type PositionedLightNode, type RegisteredLightNode } from "./types";

const TARGET_WAVE_DURATION = 800;
const REVEAL_SAFETY_TIMEOUT = 3000;
const WAVE_ORDER_Y_WEIGHT = 0.35;
const WAVE_COMPLETION_BUFFER = 200;
const TAIL_GAP = 0;

/** Run `fn` on every light-node DOM element currently registered. */
function forEachElement(
  nodes: Map<string, RegisteredLightNode>,
  fn: (el: HTMLElement) => void,
) {
  nodes.forEach((node) => {
    const el = node.ref.current;
    if (el) fn(el);
  });
}

/** Sort nodes by a diagonal sweep (top-left → bottom-right). */
function sortByWaveOrder(nodes: PositionedLightNode[]) {
  return nodes
    .map((node) => ({
      ...node,
      waveOrder: node.center.x + node.center.y * WAVE_ORDER_Y_WEIGHT,
    }))
    .sort((a, b) => a.waveOrder - b.waveOrder);
}

/** Build a timeline of "turn on" and "turn off" events for the wave. */
function buildWaveTimeline(sorted: PositionedLightNode[]) {
  const availableDuration = TARGET_WAVE_DURATION - WAVE_COMPLETION_BUFFER;
  const baseDelay =
    sorted.length > 1 ? availableDuration / (sorted.length - 1) : 0;

  const tailStart = sorted.length * baseDelay + TAIL_GAP;
  const totalDuration =
    tailStart + (sorted.length - 1) * baseDelay + WAVE_COMPLETION_BUFFER;

  const events = [
    ...sorted.map((node, i) => ({
      id: node.id,
      time: i * baseDelay,
      state: true,
    })),
    ...sorted.map((node, i) => ({
      id: node.id,
      time: tailStart + i * baseDelay,
      state: false,
    })),
  ].sort((a, b) => a.time - b.time);

  return { events, totalDuration };
}

/**
 * On a cold browser the GPU has no cached compositing-layer textures.
 * Transitioning ~200 elements without them causes a ~280 ms stall.
 *
 * We force rasterization by flipping every node "on" with CSS transitions
 * disabled (via the `.lightshow-warmup` class), forcing a style recalc,
 * then snapping back to "off" — all within a single frame.
 */
function warmUpGpu(nodes: Map<string, RegisteredLightNode>) {
  document.documentElement.classList.add("lightshow-warmup");

  forEachElement(nodes, (el) => (el.dataset.lightState = "on"));
  void document.body.offsetHeight; // force rasterization

  forEachElement(nodes, (el) => (el.dataset.lightState = "off"));
  void document.body.offsetHeight; // commit "off" before transitions re-enable

  document.documentElement.classList.remove("lightshow-warmup");
}

function LightRigProvider({ children }: PropsWithChildren) {
  const nodesRef = useRef<Map<string, RegisteredLightNode>>(new Map());
  const idCounter = useRef(0);
  const isPlayingRef = useRef(false);
  const rafIdRef = useRef<number | null>(null);

  const [isIntroPlaying, setIsIntroPlaying] = useState(true);

  const setLightState = useCallback<LightRigContextValue["setLightState"]>(
    (ids, isOn) => {
      const targetIds = Array.isArray(ids) ? ids : [ids];
      targetIds.forEach((id) => {
        const node = nodesRef.current.get(id);
        const element = node?.ref.current;
        if (!element) return;

        element.dataset.lightState = isOn ? "on" : "off";
      });
    },
    [],
  );

  const registerNode = useCallback<LightRigContextValue["registerNode"]>(
    ({ id, ref, group = "default", glowColor, weight = 1 }) => {
      const resolvedId = id ?? `light-${++idCounter.current}`;

      nodesRef.current.set(resolvedId, {
        id: resolvedId,
        ref,
        group,
        glowColor,
        weight,
      });

      const element = ref.current;
      if (element) {
        element.dataset.lightNode = "true";
        element.dataset.lightGroup = group;
        element.dataset.lightState = "off";

        if (glowColor) {
          element.style.setProperty("--lightshow-color", glowColor);
        }
      }

      return () => {
        nodesRef.current.delete(resolvedId);
        const el = ref.current;
        if (el) {
          delete el.dataset.lightNode;
          delete el.dataset.lightGroup;
          delete el.dataset.lightState;
          if (glowColor) {
            el.style.removeProperty("--lightshow-color");
          }
        }
      };
    },
    [],
  );

  const getNodesWithPosition = useCallback((): PositionedLightNode[] => {
    const nodes: PositionedLightNode[] = [];

    nodesRef.current.forEach((node) => {
      const el = node.ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      nodes.push({
        ...node,
        rect,
        center: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
      });
    });

    return nodes;
  }, []);

  /** Mark nodes as "done" so CSS drops `will-change` and frees GPU memory. */
  const releaseLightNodes = useCallback(() => {
    forEachElement(nodesRef.current, (el) => (el.dataset.lightNode = "done"));
  }, []);

  const finishIntro = useCallback(() => {
    setIsIntroPlaying(false);
    isPlayingRef.current = false;
    releaseLightNodes();
    rafIdRef.current = null;
  }, [releaseLightNodes]);

  // Safety net: auto-reveal if the intro never completes (e.g. audio context
  // blocked, instruments fail to load, or playIntroWave is never called).
  useEffect(() => {
    if (!isIntroPlaying) return;
    const id = window.setTimeout(finishIntro, REVEAL_SAFETY_TIMEOUT);
    return () => window.clearTimeout(id);
  }, [isIntroPlaying, finishIntro]);

  const playIntroWave = useCallback<
    LightRigContextValue["playIntroWave"]
  >(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (isPlayingRef.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishIntro();
      return;
    }

    // Frame 1: warm up GPU compositing layers
    rafIdRef.current = requestAnimationFrame(() => {
      warmUpGpu(nodesRef.current);

      // Frame 2: measure positions and run the wave
      rafIdRef.current = requestAnimationFrame(() => {
        const nodes = getNodesWithPosition();
        if (!nodes.length) {
          finishIntro();
          return;
        }

        const sorted = sortByWaveOrder(nodes);
        const { events, totalDuration } = buildWaveTimeline(sorted);

        isPlayingRef.current = true;
        setIsIntroPlaying(true);

        let nextEventIndex = 0;
        const start = performance.now();

        const step = (now: number) => {
          const elapsed = now - start;

          while (
            nextEventIndex < events.length &&
            elapsed >= events[nextEventIndex].time
          ) {
            const evt = events[nextEventIndex];
            setLightState(evt.id, evt.state);
            nextEventIndex += 1;
          }

          if (elapsed >= totalDuration || nextEventIndex >= events.length) {
            finishIntro();
            return;
          }

          rafIdRef.current = requestAnimationFrame(step);
        };

        rafIdRef.current = requestAnimationFrame(step);
      });
    });
  }, [getNodesWithPosition, setLightState, finishIntro]);

  const value = useMemo<LightRigContextValue>(
    () => ({
      registerNode,
      setLightState,
      playIntroWave,
      isIntroPlaying,
    }),
    [registerNode, setLightState, playIntroWave, isIntroPlaying],
  );

  return (
    <LightRigContext.Provider value={value}>
      {children}
    </LightRigContext.Provider>
  );
}

export { LightRigProvider };
