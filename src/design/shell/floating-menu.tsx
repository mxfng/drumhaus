import { Children, type ReactNode } from "react";
import {
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/design/ui";

import type { LayoutScale } from "./layout-scale";

interface FloatingMenuProps {
  /** The instrument's layout-scale instance, driving the Resize App submenu. */
  layoutScale: LayoutScale;
  /** Trigger content, typically the instrument's logo mark. */
  trigger: ReactNode;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  /** Instrument-specific menu items, rendered above the Resize App submenu. */
  children?: ReactNode;
}

/**
 * The floating system menu: a round trigger fixed to the window's top-left
 * corner (system UI floats at the window edge and never scales with the
 * chassis), opening a dropdown of instrument-provided items followed by the
 * built-in Resize App submenu.
 */
function FloatingMenu({
  layoutScale,
  trigger,
  triggerAriaLabel = "Menu",
  triggerClassName,
  children,
}: FloatingMenuProps) {
  const { scaleOptions } = layoutScale;

  const scale = layoutScale.useStore((state) => state.scale);
  const setScale = layoutScale.useStore((state) => state.setScale);
  const fitToScreen = layoutScale.useStore((state) => state.fitToScreen);
  const zoomIn = layoutScale.useStore((state) => state.zoomIn);
  const zoomOut = layoutScale.useStore((state) => state.zoomOut);

  const isAtMinScale = scale <= scaleOptions[0];
  const isAtMaxScale = scale >= scaleOptions[scaleOptions.length - 1];

  // A menu with no items of its own gets no separator: `Children.toArray`
  // drops null, undefined, and booleans, so conditionals that render nothing
  // (`{flag && <Item />}`) do not leave a stray rule above Resize App.
  const hasChildren = Children.toArray(children).length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={triggerAriaLabel}
          className={cn(
            "text-primary border-primary hover:bg-accent/20 focus-ring fixed top-2 left-2 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 bg-transparent backdrop-blur-xl transition-all duration-500",
            triggerClassName,
          )}
        >
          {trigger}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right">
        {children}
        {hasChildren && <DropdownMenuSeparator />}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Resize App</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onSelect={fitToScreen}>
              Fit to Screen
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={zoomOut} disabled={isAtMinScale}>
              Zoom Out
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={zoomIn} disabled={isAtMaxScale}>
              Zoom In
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={scale.toString()}
              onValueChange={(value) => setScale(parseInt(value))}
            >
              {scaleOptions.map((option) => (
                <DropdownMenuRadioItem key={option} value={option.toString()}>
                  {option}%
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { FloatingMenu, type FloatingMenuProps };
