import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { LightRigContext } from "./LightRigContext";
import {
  type LightRigContextValue,
  type PositionedLightNode,
  type RegisteredLightNode,
} from "./types";

export const LightRigProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const nodesRef = useRef<Map<string, RegisteredLightNode>>(new Map());
  const idCounter = useRef(0);
  const isPlayingRef = useRef(false);

  const [isIntroPlaying, setIsIntroPlaying] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

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
    if (isPlayingRef.current) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const nodes = getNodesWithPosition();
    if (!nodes.length) return;

    const sorted = nodes
      .map((node) => ({
        ...node,
        waveOrder: node.center.x + node.center.y * 0.35,
      }))
      .sort((a, b) => a.waveOrder - b.waveOrder);

    const timers: number[] = [];
    const schedule = (cb: () => void, delay: number) => {
      const timer = window.setTimeout(cb, delay);
      timers.push(timer);
      return timer;
    };

    const pulseDuration = 280;
    const baseDelay = 55;

    isPlayingRef.current = true;
    setIsIntroPlaying(true);
    setIsPointerLocked(true);

    sorted.forEach((node, index) => {
      const delay = index * baseDelay;
      schedule(() => {
        setLightState(node.id, true);
        schedule(() => setLightState(node.id, false), pulseDuration);
      }, delay);
    });

    schedule(
      () => {
        setIsPointerLocked(false);
        setIsIntroPlaying(false);
        isPlayingRef.current = false;
      },
      sorted.length * baseDelay + pulseDuration + 100,
    );

    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [getNodesWithPosition, setLightState]);

  const value = useMemo<LightRigContextValue>(
    () => ({
      registerNode,
      setLightState,
      playIntroWave,
      isIntroPlaying,
      isPointerLocked,
    }),
    [
      registerNode,
      setLightState,
      playIntroWave,
      isIntroPlaying,
      isPointerLocked,
    ],
  );

  return (
    <LightRigContext.Provider value={value}>
      {children}
    </LightRigContext.Provider>
  );
};
