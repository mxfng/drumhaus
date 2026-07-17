import { useEffect, type CSSProperties, type HTMLAttributes } from "react";
import { cn } from "@/design/ui";

import type { DesignBox, LayoutScale } from "./layout-scale";

interface ShellProps extends HTMLAttributes<HTMLDivElement> {
  layoutScale: LayoutScale;
}

/**
 * The design-box custom properties `shell.css` renders from. Injecting them
 * from the instrument's TypeScript config keeps the CSS geometry and the
 * fit-to-screen math on one source of truth.
 */
function designBoxVars(designBox: DesignBox): Record<string, string> {
  return {
    "--shell-width": `${designBox.widthRem}rem`,
    "--shell-height": `${designBox.heightRem}rem`,
    "--shell-header-height": `${designBox.headerHeightRem}rem`,
    "--shell-footer-height": `${designBox.footerHeightRem}rem`,
    "--shell-padding": `${designBox.paddingRem}rem`,
  };
}

/**
 * The outermost shell element: fills its container, carries the design-box
 * variables and the current `--layout-scale`, and enforces scale-aware
 * minimum dimensions (see `shell.css`) so the page scrolls instead of
 * clipping when the chassis is zoomed past the window.
 *
 * Fits to screen once on mount only - deliberately no resize listener, so a
 * manual zoom choice survives window resizes.
 */
function ShellRoot({
  layoutScale,
  className,
  style,
  children,
  ...props
}: ShellProps) {
  const scale = layoutScale.useStore((state) => state.scale);
  const fitToScreen = layoutScale.useStore((state) => state.fitToScreen);

  // Fit to screen on initial mount only
  useEffect(() => {
    fitToScreen();
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      data-slot="shell-root"
      className={cn("shell-root", className)}
      style={
        {
          ...designBoxVars(layoutScale.designBox),
          "--layout-scale": scale / 100,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * The scaled chassis wrapper: centered in the shell root at the fixed design
 * size, zoomed as one unit via `transform: scale()`.
 */
function ShellScaleWrapper({
  layoutScale,
  className,
  style,
  children,
  ...props
}: ShellProps) {
  const scale = layoutScale.useStore((state) => state.scale);

  return (
    <div
      data-slot="shell-scale-wrapper"
      className={cn("shell-scale-wrapper", className)}
      style={{
        transform: `translate(-50%, -50%) scale(${scale / 100})`,
        transformOrigin: "center center",
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}

export { ShellRoot, ShellScaleWrapper, type ShellProps };
