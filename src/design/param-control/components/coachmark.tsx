import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useState,
  type ReactNode,
} from "react";
import { Button, cn } from "@/design/ui";
import { Check } from "lucide-react";
import { createPortal } from "react-dom";

/**
 * Host-app seam for coachmark visibility. Coachmarks are a decorative,
 * animated affordance; an app running in a degraded-performance mode can turn
 * them off wholesale by rendering `CoachmarkProvider` with `enabled={false}`.
 * Without a provider they are enabled - the non-degraded default.
 */
const CoachmarkEnabledContext = createContext(true);

interface CoachmarkProviderProps {
  enabled: boolean;
  children: ReactNode;
}

function CoachmarkProvider({ enabled, children }: CoachmarkProviderProps) {
  return (
    <CoachmarkEnabledContext.Provider value={enabled}>
      {children}
    </CoachmarkEnabledContext.Provider>
  );
}

interface CoachmarkProps {
  visible: boolean;
  message: React.ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
  dismissable?: boolean;
  onDismiss?: () => void;
}

const FADE_DURATION_MS = 200;
const VERTICAL_OFFSET_PCT = 110;

function Coachmark({ visible, message, anchorRef, onDismiss }: CoachmarkProps) {
  const [position, setPosition] = useState<{ top: number; left: number }>();
  const [render, setRender] = useState(visible);
  const [isShown, setIsShown] = useState(false);

  const dismissable = !!onDismiss;

  const coachmarksDisabled = !useContext(CoachmarkEnabledContext);

  const show = useEffectEvent(() => {
    setRender(true);
    setIsShown(true);
  });

  const hide = useEffectEvent(() => {
    setRender(false);
  });

  useEffect(() => {
    if (coachmarksDisabled) return;

    let showTimeout: number | undefined;
    let hideTimeout: number | undefined;
    let raf: number | undefined;

    if (visible) {
      showTimeout = window.setTimeout(() => {
        show();
      }, 0);
    } else {
      raf = requestAnimationFrame(() => setIsShown(false));
      hideTimeout = window.setTimeout(() => {
        hide();
      }, 200);
    }

    return () => {
      if (showTimeout) window.clearTimeout(showTimeout);
      if (hideTimeout) window.clearTimeout(hideTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible, coachmarksDisabled]);

  useEffect(() => {
    if (!render || coachmarksDisabled) return;

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
  }, [render, anchorRef, coachmarksDisabled]);

  if (!render || !position || coachmarksDisabled) return null;

  return createPortal(
    <div
      className="bg-popover text-popover-foreground rounded-md shadow-(--shadow-neu-tall) transition-opacity"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: `translate(-50%, -${VERTICAL_OFFSET_PCT}%)`,
        transformOrigin: "50% 100%",
        zIndex: 60,
        opacity: isShown ? 1 : 0,
        transitionDuration: `${FADE_DURATION_MS}ms`,
        whiteSpace: dismissable ? "normal" : "nowrap",
      }}
    >
      <div
        className={cn(
          "relative flex flex-col items-end gap-2 text-sm",
          dismissable ? "p-3" : "px-3 py-1.5",
        )}
      >
        <div className={cn(dismissable && "flex max-w-sm flex-col gap-2 pb-3")}>
          {message}
        </div>
        {dismissable && <CoachmarkDismissButton onDismiss={onDismiss} />}
      </div>
    </div>,
    document.body,
  );
}

// Visually-hidden heading for coachmark accessibility
function CoachmarkDismissTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("sr-only text-base font-semibold", className)}
      tabIndex={-1}
      {...props}
    >
      {children}
    </h2>
  );
}

function CoachmarkContent({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-2", className)}
      role="group"
      {...props}
    >
      {children}
    </div>
  );
}

interface CoachmarkDismissButtonProps {
  onDismiss: () => void;
}

function CoachmarkDismissButton({ onDismiss }: CoachmarkDismissButtonProps) {
  return (
    <Button
      variant="secondary"
      size="xs"
      onClick={onDismiss}
      aria-label="Dismiss"
    >
      <Check />
    </Button>
  );
}

export {
  Coachmark,
  CoachmarkDismissTitle,
  CoachmarkContent,
  CoachmarkProvider,
};
export type { CoachmarkProviderProps };
