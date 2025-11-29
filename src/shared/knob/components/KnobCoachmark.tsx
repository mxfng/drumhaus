import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface KnobCoachmarkProps {
  visible: boolean;
  message: string;
  anchorRef: React.RefObject<HTMLElement | null>;
}

const FADE_DURATION_MS = 200;
const VERTICAL_OFFSET_PCT = 110;

export function KnobCoachmark({
  visible,
  message,
  anchorRef,
}: KnobCoachmarkProps) {
  const [position, setPosition] = useState<{ top: number; left: number }>();
  const [render, setRender] = useState(visible);
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    let showTimeout: number | undefined;
    let hideTimeout: number | undefined;
    let raf: number | undefined;

    if (visible) {
      showTimeout = window.setTimeout(() => {
        setRender(true);
        raf = requestAnimationFrame(() => setIsShown(true));
      }, 0);
    } else {
      requestAnimationFrame(() => setIsShown(false));
      hideTimeout = window.setTimeout(() => {
        setRender(false);
      }, 200);
    }

    return () => {
      if (showTimeout) window.clearTimeout(showTimeout);
      if (hideTimeout) window.clearTimeout(hideTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible]);

  useEffect(() => {
    if (!render) return;

    const updatePosition = () => {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setPosition({
        top: rect.top,
        left: rect.left + rect.width / 2,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [render, anchorRef]);

  if (!render || !position) return null;

  return createPortal(
    <div
      className="bg-primary text-primary-foreground pointer-events-none rounded-md px-3 py-1.5 text-sm whitespace-nowrap shadow-(--shadow-neu-tall) transition-opacity"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: `translate(-50%, -${VERTICAL_OFFSET_PCT}%)`,
        transformOrigin: "50% 100%",
        zIndex: 60,
        opacity: isShown ? 1 : 0,
        transitionDuration: `${FADE_DURATION_MS}ms`,
      }}
    >
      {message}
    </div>,
    document.body,
  );
}
