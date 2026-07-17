# @haus/tokens

The shared design-token layer for the instrument family.
Plain CSS, consumed as source: OKLCH color tokens, neumorphic shadows, control (knob/slider) variables, typography, animation tokens, the matching Tailwind v4 `@theme` mirror, neumorphic utility classes, and the family fonts.

## Usage

In an app's Tailwind entry stylesheet, import the theme after Tailwind and any Tailwind plugin CSS, and the utilities after the app's base styles:

```css
@import "tailwindcss";

@import "@haus/tokens/theme.css";
@import "./styles/theme.css"; /* app-specific tokens */

@import "./styles/base.css";

@import "@haus/tokens/utilities.css";
```

Load the fonts once from the app entry module:

```ts
import "@haus/tokens/fonts.css";
```

## What belongs here

Tokens a sibling instrument would want: the shared design language (surface, primary, screen, neumorphic shadow and highlight ramps, knob and slider variables, typography, animation timing).
Instrument-domain tokens (track colors, sequencer indicators, app layout dimensions, and the like) stay in each app's own theme stylesheet, layered after this package.

## Package layout

| entry             | contents                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `./theme.css`     | `:root` design tokens plus the Tailwind v4 `@theme` mirror            |
| `./utilities.css` | neumorphic (`.neu*`), surface (`.surface*`), and focus-ring utilities |
| `./fonts.css`     | Albert Sans Variable import and the Fusion Pixel `@font-face`         |
