import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { LightRigContext, type LightRigContextValue } from "./LightRigContext";
import { type PositionedLightNode, type RegisteredLightNode } from "./types";

const TARGET_WAVE_DURATION = 800; // total sweep duration
const WAVE_ORDER_Y_WEIGHT = 0.35;
const WAVE_COMPLETION_BUFFER = 200;
const TAIL_GAP = 260; // wait before the tail starts turning lights off

export const LightRigProvider: React.FC<PropsWithChildren> = ({ children }) => {
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
      const registration: RegisteredLightNode = {
        id: resolvedId,
        ref,
        group,
        glowColor,
        weight,
      };

      nodesRef.current.set(resolvedId, registration);

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

  const playIntroWave = useCallback<
    LightRigContextValue["playIntroWave"]
  >(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (isPlayingRef.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const nodes = getNodesWithPosition();
    if (!nodes.length) return;

    const sorted = nodes
      .map((node) => ({
        ...node,
        waveOrder: node.center.x + node.center.y * WAVE_ORDER_Y_WEIGHT,
      }))
      .sort((a, b) => a.waveOrder - b.waveOrder);

    const availableDuration = TARGET_WAVE_DURATION - WAVE_COMPLETION_BUFFER;
    const baseDelay =
      sorted.length > 1 ? availableDuration / (sorted.length - 1) : 0;

    isPlayingRef.current = true;
    setIsIntroPlaying(true);

    const tailStart = sorted.length * baseDelay + TAIL_GAP;
    const totalDuration =
      tailStart + (sorted.length - 1) * baseDelay + WAVE_COMPLETION_BUFFER;

    const onSchedule = sorted.map((node, index) => ({
      id: node.id,
      time: index * baseDelay,
    }));
    const offSchedule = sorted.map((node, index) => ({
      id: node.id,
      time: tailStart + index * baseDelay,
    }));

    let nextOnIndex = 0;
    let nextOffIndex = 0;
    const start = performance.now();

    const step = (now: number) => {
      const elapsed = now - start;

      while (
        nextOnIndex < onSchedule.length &&
        elapsed >= onSchedule[nextOnIndex].time
      ) {
        setLightState(onSchedule[nextOnIndex].id, true);
        nextOnIndex += 1;
      }

      while (
        nextOffIndex < offSchedule.length &&
        elapsed >= offSchedule[nextOffIndex].time
      ) {
        setLightState(offSchedule[nextOffIndex].id, false);
        nextOffIndex += 1;
      }

      if (elapsed >= totalDuration) {
        setIsIntroPlaying(false);
        isPlayingRef.current = false;
        rafIdRef.current = null;
        return;
      }

      rafIdRef.current = requestAnimationFrame(step);
    };

    rafIdRef.current = requestAnimationFrame(step);
  }, [getNodesWithPosition, setLightState]);

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
};
