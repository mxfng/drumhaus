# @haus/shell

The shared app shell for the instrument family.
Every instrument is a fixed-size piece of hardware rendered in a browser window; this package owns everything around that chassis: the hardware-size and layout-scale system, plugin-style zoom (fit to screen, zoom in and out, resize to a percent), and the floating system-menu scaffold at the window's top-left corner.

## Usage

Create one layout-scale instance per instrument from its design box, then compose the shell components around the chassis:

```tsx
import {
  createLayoutScale,
  FloatingMenu,
  ShellRoot,
  ShellScaleWrapper,
} from "@haus/shell";

const layoutScale = createLayoutScale({
  designBox: {
    widthRem: 90,
    heightRem: 56.25,
    headerHeightRem: 2.5,
    footerHeightRem: 2.5,
    paddingRem: 5,
  },
});

function App() {
  return (
    <ShellRoot layoutScale={layoutScale}>
      <FloatingMenu layoutScale={layoutScale} trigger={<Logo />}>
        {/* instrument menu items, built from @haus/ui dropdown primitives */}
      </FloatingMenu>
      <ShellScaleWrapper layoutScale={layoutScale}>
        {/* the chassis, laid out at the fixed design size */}
      </ShellScaleWrapper>
    </ShellRoot>
  );
}
```

The structural CSS ships as package CSS; import it from the app's Tailwind entry stylesheet, and register this package's source so Tailwind emits the scaffold's utility classes:

```css
@import "@haus/shell/shell.css";

@source "../../../../packages/shell/src";
```

## The design box as single source of truth

An instrument's geometry is declared once, in TypeScript, as its `DesignBox` (chassis width and height, header and footer rows, minimum fit padding, all in rem).
`ShellRoot` injects that box as CSS custom properties (`--shell-width`, `--shell-height`, `--shell-header-height`, `--shell-footer-height`, `--shell-padding`) alongside the live `--layout-scale`, and `shell.css` renders exclusively from those variables.
The fit-to-screen math reads the same object, so the CSS geometry and the zoom math cannot drift apart.

## Layout scale

`createLayoutScale({ designBox, scaleOptions? })` returns a `LayoutScale`: a bound zustand store (`useStore`) holding `scale` (percent) with `setScale`, `zoomIn`, `zoomOut`, and `fitToScreen` actions, plus the normalized `scaleOptions` and the `designBox` itself.
The default option ladder is `DEFAULT_SCALE_OPTIONS` (50-200%), shared so the whole family steps through the same stops.
The store is not persisted: `ShellRoot` fits to screen once on mount (deliberately with no resize listener, so a manual zoom survives window resizes), and `fitToScreen` picks the largest option at which the design box plus padding fits the window.
The pure math is exported as `computeFitScale` for tests.

## Floating menu

`FloatingMenu` renders the round trigger fixed at the window's top-left edge - system UI floats at the window edge and never scales with the chassis - with the instrument's logo as `trigger` and its menu items as `children`, followed by the built-in Resize App submenu (Fit to Screen, Zoom Out, Zoom In, and a radio group of the option ladder) wired to the passed `LayoutScale`.
`IS_MAC_LIKE` and `platformShortcutLabel(mac, other)` are exported for instrument menus that show keyboard-shortcut labels.

## What belongs here

Shell chrome an instrument family member would want: window-level layout, zoom, and the system-menu scaffold, with no instrument-domain logic.
The chassis itself, its menu items, and their stores stay in each app; generic controls live in `@haus/ui` and the knob/fader layer in `@haus/param-control`.
