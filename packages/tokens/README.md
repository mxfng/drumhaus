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

## Instrument brand overrides

The brand color scheme ships with defaults (the family orange) but is per-instrument overridable.
An instrument pins or replaces its brand by re-declaring any subset of the base brand tokens in its own `:root`, in a stylesheet imported after this package's `theme.css` - the later declaration wins in the cascade.
No `@theme` changes are needed: the mirror references the runtime custom properties, so every utility picks up the override.

The brand surface consists of four base tokens:

| token                        | shipped default                   |
| ---------------------------- | --------------------------------- |
| `--color-primary`            | `oklch(0.7245 0.189 50.94)`       |
| `--color-primary-foreground` | `oklch(1 0 0)`                    |
| `--color-primary-shadow`     | `oklch(0.7245 0.189 50.94 / 60%)` |
| `--color-accent`             | `oklch(0.7687 0.1641 58.66)`      |

Four derived aliases follow their base token automatically, so an instrument overriding only the base tokens gets coherent derivatives for free:

| alias                        | derives from                 |
| ---------------------------- | ---------------------------- |
| `--color-primary-muted`      | `--color-accent`             |
| `--color-accent-foreground`  | `--color-primary-foreground` |
| `--color-popover`            | `--color-primary`            |
| `--color-popover-foreground` | `--color-primary-foreground` |

Note that `--color-primary-shadow` is a literal (primary at 60% alpha), not an alias: an instrument changing `--color-primary` must re-declare the shadow to match.
Drumhaus pins the shipped orange explicitly in its own theme; an instrument that wants the family default can simply declare nothing.

## What belongs here

Tokens a sibling instrument would want: the shared design language (surface, primary, screen, neumorphic shadow and highlight ramps, knob and slider variables, typography, animation timing).
Instrument-domain tokens (track colors, sequencer indicators, app layout dimensions, and the like) stay in each app's own theme stylesheet, layered after this package.

## Package layout

| entry             | contents                                                              |
| ----------------- | --------------------------------------------------------------------- |
| `./theme.css`     | `:root` design tokens plus the Tailwind v4 `@theme` mirror            |
| `./utilities.css` | neumorphic (`.neu*`), surface (`.surface*`), and focus-ring utilities |
| `./fonts.css`     | Albert Sans Variable import and the Fusion Pixel `@font-face`         |
