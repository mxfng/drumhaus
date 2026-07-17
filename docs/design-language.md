# The family design language

Status: living document.
Author: Max, July 2026.

This document codifies the design language of the instrument family as it exists in code today: Drumhaus (`apps/drumhaus`), the minimal sibling `apps/pulse`, and the shared packages `@haus/tokens`, `@haus/ui`, `@haus/param-control`, and `@haus/shell`.
It is a description of what shipped, not a proposal.
Every recipe below is extracted from the source files it names; when the code and this document disagree, the code is either right or listed as a known deviation in [design-inventory.md](./design-inventory.md).

The goal is that a sibling instrument is roughly 80% shared design system and 20% its own flavor.
The [component inventory](./design-inventory.md) appendix tracks what is already shared, what should be lifted next, and what stays app-specific.

## 1. Design philosophy

Each instrument is a piece of hardware that happens to render in a browser.
The DOM plays the role of injection-molded plastic: light, shadow, and material are simulated with layered box-shadows and gradients, never with 3D transforms, perspective, or textures.
The result is a calm cream chassis with soft neumorphic extrusion - controls look pressed out of or into the surface, and depth is information (raised means touchable, recessed means display).

The design law, in order:

- Future-thinking, but built on proven design principles.
- Everything is visible on the screen in front of you, like a physical product.
  There is one fixed chassis, laid out at design size and zoomed as a unit; nothing important scrolls, collapses, or hides.
- Nested menus are the antithesis of the design.
  The one dropdown menu in the product is the floating system menu at the window edge, deliberately off the chassis; dialogs are rare and reserved for file-level acts (save, share, confirm-discard).
- Dense with controls, but visually calm, symmetrical, and balanced.
- The layout groups product functions logically and in an aesthetically pleasing way.
- Through use, the tool's abilities reveal themselves organically.
  Progressive disclosure happens by exploration (modes light up their valid targets, a first-drag coachmark appears once), never by hiding controls.
- Every knob, label, and grid cell earned its place or got cut.
  This is the review bar for any new control.

Two hard rules follow from the law:

**Bare labels.**
Controls carry a single lowercase word (`decay`, `tune`, `filter`, `pan`, `bpm`, `nudge`) and nothing else.
No descriptions, no inline hints, no helper text on the chassis.
The only sanctioned copy channel is the hover tooltip (`Tooltip` from `@haus/ui`, 1000 ms default delay), which holds one short imperative sentence.
Power users are trusted.

**The chassis is sacred; system UI floats at the window edge.**
The instrument surface is hand-designed by the product owner; agents and tooling do not place controls on it.
Anything that is about the app rather than the instrument (menu, zoom, session link) lives in fixed-position chrome at the window edge, outside the scale transform, in the round bordered backdrop-blur idiom (`packages/shell/src/floating-menu.tsx`, `apps/drumhaus/src/features/session/components/link-control.tsx`).

## 2. Lineage

The lineage is fourfold.

**Bauhaus.**
The root DNA, and the source of the product name itself (drumhaus, after bauhaus).
From it: form follows function, geometric primitives, grid discipline, and the conviction that a dense tool can be composed until it reads as calm.

**Dieter Rams at Braun.**
The industrial-design line that Apple and Jony Ive later carried forward.
From it: as little design as possible, honest materials, a neutral body with restrained accent color, and controls whose affordance is legible at a glance.

**Roland rhythm machines - TR-808, TR-909, and the modern TR-1000.**
The direct ancestors of a drum machine's control vocabulary.
From them: the colored step-key row along the bottom edge, running step indicators, section labels ruled across related controls, chunky mode selectors, and the one-knob-per-function panel.

**Teenage Engineering - OP-1, TX-6, the pocket operators, EP-133 K.O.II.**
The contemporary synthesis of the first three, and the closest structural reference.

What the family borrows is structural, not pixel-copied:

- A component system reused across products, varied by size, color, and shape rather than redesigned per product.
- Strict grid discipline with named module zones: a screen strip, a control matrix, a transport row, a step row.
- Families of caps: square caps, round caps, pill and rocker shapes, and colored accent caps on a neutral body.
- Tiny lowercase captions, with group labels ruled across the controls they govern.
- Port and section labels rendered as inverted chips (light text on a dark tab).
- Segmented-LCD and icon-bath screen idioms: one small display doing many jobs through modes.
- A per-product accent palette on a shared neutral chassis.
- Decorative but disciplined texture: LED dot fields, grille patterns, serial blocks.

Where the family deliberately diverges:

- Soft neumorphic extrusion in warm cream, instead of hard gray plastic; depth comes from the paired shadow/highlight token ramp, not from bevel lines.
- An OKLCH token architecture with a swappable brand layer, instead of a fixed print color.
- A pixel font (Fusion Pixel 12px Monospaced SC) for everything shown "on screen", instead of a segmented LCD face.
- Web-native interaction that hardware cannot do: descriptor-driven drag gestures with detents and fine-drag, type-in on double-click, wrap-around value tooltips, first-use coachmarks, undo history, and a lightshow intro.

## 3. Tokens and theming

The token layer is `@haus/tokens` (`packages/tokens/src/theme.css`), plain CSS consumed as source.
Every token is declared on `:root` and mirrored in a Tailwind v4 `@theme` block via `var()` references, so Tailwind generates the utilities while the runtime values stay overridable custom properties.

### Neutral core

The chassis palette is warm and low-chroma, all OKLCH:

| token                         | value                        | role                                    |
| ----------------------------- | ---------------------------- | --------------------------------------- |
| `--color-background`          | `oklch(0.852 0.0163 73.66)`  | page and chassis cream                  |
| `--color-foreground`          | `oklch(0.6434 0.054 60.72)`  | default text                            |
| `--color-foreground-muted`    | `oklch(0.7607 0.0398 67.17)` | secondary text, knob indicator          |
| `--color-foreground-emphasis` | `oklch(0.4479 0.0397 62.14)` | strong text, slider track               |
| `--color-secondary`           | `oklch(0.931 0.0104 67.7)`   | light fill; `--color-screen` aliases it |
| `--color-screen-foreground`   | emphasis at 80% alpha        | screen text                             |
| `--color-surface`             | `oklch(0.9474 0.0098 9.54)`  | raised light surface                    |
| `--color-knob`                | `#efe6de`                    | knob cap face                           |
| `--color-border`              | `--color-shadow-60`          | hairline borders                        |
| `--color-destructive`         | `oklch(0.5677 0.211 26.44)`  | destructive actions                     |

### Brand surface

The brand is a four-token surface with shipped defaults (the family orange), per-instrument overridable:

| base token                   | shipped default                   |
| ---------------------------- | --------------------------------- |
| `--color-primary`            | `oklch(0.7245 0.189 50.94)`       |
| `--color-primary-foreground` | `oklch(1 0 0)`                    |
| `--color-primary-shadow`     | `oklch(0.7245 0.189 50.94 / 60%)` |
| `--color-accent`             | `oklch(0.7687 0.1641 58.66)`      |

Four aliases derive from the base tokens automatically: `--color-primary-muted` (from accent), `--color-accent-foreground`, `--color-popover`, and `--color-popover-foreground` (from primary and its foreground).
The override contract (from `packages/tokens/README.md`): an instrument re-declares any subset of the base tokens on its own `:root`, in a stylesheet imported after the package theme; the cascade does the rest, and no `@theme` change is needed because the mirror references the runtime properties.
Overrides must be on `:root` (the aliases substitute at `:root`), and `--color-primary-shadow` is a literal, so a brand change must re-declare it to match.
Drumhaus pins the shipped orange explicitly in `apps/drumhaus/src/app/styles/theme.css`; pulse declares nothing and wears the default.

### Neumorphic ramp

Depth is two paired color families with alpha steps:

- `--color-shadow` `oklch(0.6818 0.0555 68.55)` at 10/30/50/60% - the warm cast shadow.
- `--color-highlight` `oklch(0.9776 0.0146 312.25)` at 17/20/30/40% - the cool top-left light.
- `--color-gradient-light` / `--color-gradient-dark` - the raised-surface gradient endpoints.

The shadow tokens compose into a named elevation ramp, with utility classes in `packages/tokens/src/utilities.css` (the `*-raised` utilities also apply the 160deg surface gradient):

| shadow / utility                                | offset scale | observed meaning in code                                                    |
| ----------------------------------------------- | ------------ | --------------------------------------------------------------------------- |
| `--shadow-inset`                                | 2px inset    | recessed wells: screen readouts, slider track, neumorphic separator grooves |
| `--shadow-neu` / `.neu`                         | 3px          | low relief: a lit sequencer pad, toasts                                     |
| `--shadow-neu-raised` / `.neu-raised`           | 2px, subtle  | button caps (the `hardware` button variant)                                 |
| `--shadow-neu-md` / `.neu-medium-raised`        | 6-10px       | the chassis panel itself; the play button's inner disc                      |
| `--shadow-neu-tall` / `.neu-tall`               | 10-12px      | the knob base disc; floating chrome (coachmark)                             |
| `--shadow-neu-tall-raised` / `.neu-tall-raised` | 12-16px      | the knob's raised edge ring                                                 |
| `--shadow-neu-xl` / `.neu-extra-tall`           | 20-30px      | reserved for the largest lift; currently unused                             |

Component-level composites build on the ramp: `--knob-shadow`, `--knob-shadow-center`, `--knob-shadow-ring`, `--knob-shadow-inset`, `--knob-gradient` (120deg), and `--slider-track-bg` / `--slider-track-shadow`.

### Typography

Two faces, loaded from `packages/tokens/src/fonts.css`:

- `--font-sans`: Albert Sans Variable.
  Everything printed on the chassis: labels, captions, buttons, tooltips, dialogs.
- `--font-pixel`: Fusion Pixel 12px Monospaced SC.
  Everything shown "on screen": screen selects and readouts, numeric values, step numbers and instrument names, variation badges, micro caps on icon buttons, the pulse wordmark.

The split is the material boundary: sans is ink on plastic, pixel is light on glass.

### Animation

`--animate-duration` is 150 ms, the default transition length for control state.
Two shared keyframes carry mode feedback: `brightness-pulse` (2 s breathing, on interactable targets) and `brightness-blink` (0.5 s stepped blink, on the copy source).

### Night mode

Night mode swaps the page background only: a `night-mode` class on `html`/`body`/`#root` sets `background-color` to the app token `--color-background-night` (`oklch(0.1473 0.0107 285.01)`), cross-faded by the 1.5 s background transition in `base.css`.
The chassis keeps its cream; the instrument does not have a dark theme, it has a dark room (Drumhaus fills it with the `NightSky` audio visualizer).

### Potato mode

The degraded-performance mode nulls the entire depth system (`apps/drumhaus/src/app/styles/potato.css`): every `--shadow-neu*`, `--knob-shadow*`, and `--slider-track-shadow` token is set to `none`, all box-shadows, transitions, and animations are killed with `!important`, and the animated interactable highlight falls back to a static 2px accent outline.
Coachmarks are disabled through `CoachmarkProvider enabled={false}`.
Because depth lives in tokens, one override flattens the whole product coherently.

## 4. Layout system

### The design box and scale

An instrument declares its geometry once, in TypeScript, as a `DesignBox` (`packages/shell/src/layout-scale.ts`): chassis width and height, header and footer row heights, and minimum fit padding, all in rem.
Drumhaus: 90rem x 56.25rem chassis (1440x900 px at 16 px root), 2.5rem header and footer rows, 5rem fit padding (`apps/drumhaus/src/shared/store/layout-scale.ts`).

`ShellRoot` injects the box as `--shell-*` custom properties plus the live `--layout-scale`; `shell.css` renders exclusively from them, and the fit-to-screen math reads the same object, so CSS geometry and zoom math cannot drift.
`ShellScaleWrapper` centers the chassis at fixed design size and zooms it as one unit with `transform: scale()`.
The zoom ladder is shared family-wide: 50, 60, 70, 80, 90, 100, 120, 140, 160, 180, 200 percent (`DEFAULT_SCALE_OPTIONS`).
The shell fits to screen once on mount and deliberately never on resize, so a manual zoom choice survives.
This is the "everything visible" law made mechanism: one fixed surface, scaled, never reflowed.

### Chassis framing

The chassis is a single panel: `neu-medium-raised surface relative overflow-clip rounded-xl border` (Drumhaus adds `h-225 w-360`; pulse uses the same recipe at content size).
Module zones stack inside it, divided by full-width neumorphic grooves (`Separator variant="neumorphic"`: `h-1` with `inset 2px 1px 2px 0 var(--color-shadow-30)`).

Drumhaus's zones, top to bottom (`apps/drumhaus/src/layout/drumhaus.tsx`):

1. Header, `h-24 grid-cols-8 p-6`: logo and product designation left (columns 1-4), the screen right (columns 5-8).
2. Instrument grid, `grid-cols-8 divide-x px-6 py-3`: eight channel strips separated by hairlines.
3. Controls panel, `grid-cols-8 px-6 py-4`: a label ruling row, then play button, tempo cluster, pattern module, groove module, FX + compressor module, master volume.
4. Sequencer, `grid-cols-16 gap-4 p-6 h-40`: the step row.

### Grid and spacing conventions

- The master grid is 8 columns; the sequencer doubles it to 16.
- Horizontal chassis gutter is `px-6` (1.5rem) everywhere.
- Intra-module spacing is `gap-2` (0.5rem); the module's vertical rhythm is `gap-4` (1rem); the sequencer uses `gap-4` between pads.
- Radius scale: `rounded-xl` chassis, `rounded-2xl` screens and instrument tiles, `rounded-lg` hardware buttons, `rounded-md` overlays, `rounded-full` circular controls and LEDs.
- The diagonal-corner motif is the family's signature shape: two opposite corners rounded, two square.
  It appears on the default button (`rounded-tl-md rounded-br-md`), toasts (`rounded-tr-md rounded-bl-md`), sequencer pads (`rounded-[0_16px_0_16px]`), velocity bars (`rounded-[200px_0_200px_0]`), variation badges (`rounded-tr rounded-bl`), and the screen bar chip (`rounded-tl-full rounded-br-md`).

### The hardware module

`HardwareModule` (`packages/ui/src/hardware-module.tsx`) is the chassis grouping primitive:

- `HardwareModule`: a `flex w-full flex-col gap-2` container for one function group.
- `HardwareModuleLabel`: a fixed `h-4` centered row holding a `<mark>` chip - `bg-foreground text-surface rounded px-2 text-xs` (default, the inverted chip) or `border border-foreground bg-transparent text-foreground` (`variant="outline"`).
- `HardwareModuleSpacer`: an `h-4` blank to keep sibling modules aligned when one has no label.

The controls-panel label row is the group ruling idiom inherited from the Roland panels: one chip per function group (`tempo`, `pattern`, `groove`, `FX + compressor`), each spanning the grid columns of the controls it governs, placed in the row above them.
Chips are lowercase except acronyms (`FX`, `LINK`).

## 5. Component anatomy

### Knobs

`RotaryKnob` (`packages/param-control/src/components/rotary-knob.tsx`) is the neumorphic skin over the headless `Knob` primitive and the descriptor engine.

Anatomy, inside a square cell (`size="default"` is `h-20`, `size="lg"` is `h-44` - 80 px and 176 px, though the code comment names the original hardware cells as 90 px and 180 px):

- A motionless base stack, so the shadows read as fixed light: outer disc (80% of cell, `--knob-gradient`, `--shadow-neu-tall`, `border-shadow-30`), raised edge ring (60% of that, `--shadow-neu-tall-raised`), and the cap (80% of that, `bg-knob`, `--knob-shadow-center`).
- A rotating invisible hitbox over the stack carrying the interaction and a single indicator tick: a 2-unit-wide SVG line in `stroke-foreground-muted` at the top edge.
- Sweep is 270 degrees, -135 to +135, centered on 12 o'clock.
- Fixed outer ticks: `0.5 x 0.5` `bg-shadow` dots on the cell edge, count per parameter (odd for a centered mark), default 2.
- The caption `Label` below, `text-xs`, bare lowercase.

Observed tick conventions in Drumhaus: 15 for `tune`, 3 for `filter` and `pan`, 5 for `reverb` and `phaser`, 8 for `ratio`, 13 for the `lg` `output level`, 0 (and no indicator) for the tempo knobs (`bpm` and `swing`) whose values live on the screen instead.

Interaction contract (the engine, `useParamControl`): the resting knob shows no number; the value appears in a wrap-around tooltip only while dragging, on whichever side has viewport room.
The body is drag-only with a 3 px threshold; default sensitivity is 1/300 normalized units per pixel (a full sweep in ~300 px).
Double-click resets to default; double-click on the caption opens type-in (only when the descriptor can `parse`); a first horizontal drag raises the one-time "Drag up/down to adjust" coachmark.
Detents snap during coarse drag only; keyboard and wheel step precisely.

### Sliders

`LinearSlider` (`packages/param-control/src/components/linear-slider.tsx`) shares the engine and contract.
The track is a recessed channel: 12 px thick, `bg-(--slider-track-bg)` (foreground-emphasis) with `--slider-track-shadow` (inset shadow plus a 2 px shadow ring), `rounded-lg`.
The thumb is a 16 px raised disc, `bg-surface rounded-full border`, inset so it never overhangs the track ends.
Drumhaus uses the vertical orientation with `hideLabel` as the per-channel volume fader, flanked by the gain-meter LED ladder and the mute/solo buttons.

`ValueField` (`packages/param-control/src/components/value-field.tsx`) is the screen-side presentation: label and `tabular-nums` value fused into one draggable element (drag up to increase, tap to type, Delete/Backspace to reset), used for `bpm` and `swing` in the screen bar with tighter per-descriptor sensitivities.

### Buttons

`Button` (`packages/ui/src/button.tsx`) base: `inline-flex items-center justify-center gap-2 rounded-br-md rounded-tl-md text-sm font-medium transition-all`, with sizes `default` (h-9), `xs`, `sm` (h-10), `lg` (h-12), `icon`, `icon-sm`, `icon-lg`, and `screen` (fill parent).

The chassis variants:

- `hardware`: `neu-raised text-foreground hover:text-accent font-light border rounded-lg w-full`, with chrome kept on disable (`disabled:opacity-100!` while children dim) so a dead button still looks molded in.
  This is the square cap: `vari chain`, `copy`, `paste`, `clear`, `undo`, `accent`, `velocity`, `ratchet`, `flam`, the pulse transport and scene keys.
- `hardware-icon`: `surface-raised ... border rounded-full aspect-square` - the small round cap for icon toggles (mute, solo, bpm/swing/tap, nudge arrows).
- `screen`: `rounded-none bg-transparent p-0.5 hover:bg-screen/20` - flat touch targets living inside a screen.

Active state is a family-wide convention, not a variant: `buttonActive(isActive)` returns `border-primary border-2 text-primary transition-colors` (`apps/drumhaus/src/shared/lib/button-active.ts`).
An "on" control is ringed and inked in the brand color; the fill never changes.
Mode buttons that need a target additionally take `interactableHighlight` (see indicators).

### Pads (sequencer steps)

The step column (`apps/drumhaus/src/features/sequencer/components/`) is indicator, pad, velocity bar.

The pad (`sequencer-step.tsx`): `aspect-square w-full rounded-[0_16px_0_16px] border overflow-hidden`, with a fixed radial sheen overlay (`radial-gradient` white at 20%) on top.
States are driven by data attributes written on the shared animation clock, so Tailwind variants resolve without class churn:

- Base: `bg-secondary` with a warm inset shadow (`0 4px 8px rgba(176,147,116,0.3) inset`), `hover:bg-accent/40`.
- `data-[active=true]`: `bg-primary shadow-neu` - a lit pad pops out.
- Active while viewing a variation that is not playing: `bg-accent` (the muted brand tone).
- `data-[guide-only=true]` (ratchet/flam guide): `bg-background`, slightly darker inset.
- Chain-edit mode recolors active pads with the per-variation color set at 60% opacity.

Pads are also lightshow nodes: `data-light-node` / `data-light-group="sequencer-step"` attach a `::after` overlay in `--lightshow-color-overlay` (derived from `--color-primary`) that the intro rig fades in (`apps/drumhaus/src/app/styles/lightshow.css`).

The step indicator above each pad: an `h-1 w-full rounded-full` bar, idle in the app's indicator tokens (accented every fourth step), switched to `bg-primary` with a `0 0 4px var(--color-primary-shadow)` glow on the running step.

The velocity bar below: `h-3.5 rounded-[200px_0_200px_0] outline-primary outline-1`, a `bg-primary` fill with `blur-xs` sized by velocity, and a pixel-font readout that de-blurs on hover; visible at 60% opacity only when the step is active.

### LEDs

The LED dot is a single idiom reused everywhere: `h-1 w-1 rounded-full`, off is `bg-border`, on is `bg-primary` plus `shadow-[0_0_4px_var(--color-primary-shadow)]`.
Consumers: the 4x16 variation preview grid, the 5-dot timing-nudge meter, the chain-edit screens' `preview-led`s, and (with a green/yellow/red scale, a known deviation) the channel gain meter.
Dot pitch is `gap-1.5`.

### Screens

A screen is a recessed display area: `bg-screen` (the light secondary tone), `text-screen-foreground`, pixel font for content, and either an `outline outline-border rounded-2xl` frame (the Drumhaus header screen, `apps/drumhaus/src/layout/screen.tsx`) or `shadow-inset rounded-xl` for small wells (the pulse bpm readout: `bg-screen text-screen-foreground shadow-inset font-pixel tabular-nums`).
The header screen's frame sets `text-foreground` on the container; the screen tones come from the children (the inverted tabs and readouts inside apply `text-screen` / `text-screen-foreground` themselves).

Screen idioms observed in Drumhaus:

- The selector row (`preset-control.tsx`): a fixed-width inverted label tab (`bg-screen-foreground text-screen`, `preset` / `kit`), a fill-width borderless `Select` (`size="screen"`, pixel font, screen-toned dropdown), and an action cluster of `variant="screen"` icon buttons on an inverted panel.
  Rows are separated by hairlines in screen tones; corner radii on the tabs are asymmetric, continuing the diagonal motif.
- The screen bar (`layout/screen-bar.tsx`): the inverted chip strip (`bg-screen-foreground text-screen rounded-tl-full rounded-br-md`) holding live `ValueField`s and status (`play` badge, `chain` string), with worst-case width reserved so numbers never shift the row.
- Mode screens: the right screen half swaps wholesale per mode (chain edit, clipboard, clear, accent, flam, ratchet), each a `bg-screen` column - one display, many jobs.
- The screen flash (`shared/components/screen-flash-overlay.tsx`): confirmations take the screen over for 1.5 s with an icon and a lowercase message sliding in from the bottom, instead of raising a toast over the chassis.
- The idle screen runs the frequency analyzer (canvas pixel bars, 2 px quantized) under the logo sweep.

### The play button

The one oversized control (`apps/drumhaus/src/features/transport/components/play-pause-button.tsx`): a `variant="hardware"` square at `--app-play-button` (9rem) with `rounded-xl`, containing a `neu-medium-raised` circular disc at `--app-play-button-inner` (7.5rem) with an added contact-shadow ring, holding a filled 50 px play/pause glyph at `strokeWidth 1`.
A cap within a cap: the square base is the socket, the circle is the button.

### Labels and captions

- Control captions: bare lowercase words in `text-sm` (`Label` default) or `text-xs` under knobs; `text-[10px]` for the tempo cluster's micro captions.
- Group labels: the `HardwareModuleLabel` inverted chip ruling described in section 4.
- Screen labels: inverted tabs in screen tones.
- On-screen text is lowercase throughout (including flash messages); acronyms stay uppercase.

### Indicators and mode feedback

- Toggled-on: `buttonActive` primary ring and ink.
- Selected instrument: `border-primary/60 bg-primary/5` on the strip's `rounded-2xl` frame.
- Pick-a-target modes (copy, paste, clear, chain edit): `interactableHighlight` - a spinning conic-gradient border (`.interactable-highlight-border`, 2.75 s) plus `animate-brightness-pulse` on every valid target.
- The copy source: `copiedItemHighlight` - `animate-brightness-blink`.
- Variation identity: `VariationBadge`, a pixel-font diagonal chip in the per-variation color trio (`/20` background, `/60` border, full text).
- Session state (window edge): the LINK control fills with `bg-primary` while linked, shows the peer count as a bare number, and a small dot while conducting.

### Overlays

Overlays wear the brand: tooltips, toasts, and coachmarks are all `bg-popover text-popover-foreground` (popover derives from primary), but each carries its own shape.
Tooltips are `rounded-md` with no shadow (`packages/ui/src/tooltip.tsx`); toasts take the diagonal motif, `rounded-tr-md rounded-bl-md` with `shadow-neu` (`packages/ui/src/toast.tsx`); coachmarks are `rounded-md` with `--shadow-neu-tall` (`packages/param-control/src/components/coachmark.tsx`).
Dialogs are neutral panels reserved for file-level acts, per the no-nested-menus law.
The floating system menu is the single dropdown tree in the product, and it lives off-chassis.

## 6. The 80/20 rule

A sibling instrument takes from the packages:

- `@haus/tokens`: the whole visual constitution - palette, brand contract, depth ramp, both fonts, animation timing, and the neumorphic/surface/focus utilities.
- `@haus/ui`: buttons and caps, the hardware module and its label chips, screens' select, dialogs, dropdowns, tooltips, toasts, separators, form fields, `cn`.
- `@haus/param-control`: the entire parameter interaction model - descriptors, tapers, detents, the headless engine and `Knob` primitive, and the styled `RotaryKnob`, `LinearSlider`, `ValueField`, with coachmark guidance.
- `@haus/shell`: the design box, the scale ladder and fit logic, `ShellRoot`/`ShellScaleWrapper`, and the floating system menu scaffold.

An instrument must design for itself:

- Its chassis: the design box dimensions, module zones, and every control placement (the hand-designed surface).
- Its brand: the four base tokens, or nothing to accept the family orange.
- Its domain semantics: what the knobs mean, the descriptor catalog with ranges and tapers, kit/preset content, stores and engine.
- Its identity: logo, wordmark, trigger art for the floating menu, and any signature ornament (Drumhaus's logo sweep, night sky).
- Its app-level tokens: track colors, indicator colors, layout dimensions, layered after the package theme.

Pulse (`apps/pulse`) is the worked example of a minimal sibling.
Its entire chrome is package-supplied: the chassis panel is the same `neu-medium-raised surface rounded-xl border` recipe, transport and scenes are `variant="hardware"` buttons with the `border-primary border-2 text-primary` active convention, the bpm readout is the `bg-screen shadow-inset font-pixel` well, and the wordmark is pixel-font with letter-spacing.
Its own stylesheet (`apps/pulse/src/styles.css`) is about forty lines of layout glue: token imports, an `@source` registration, base element wiring, and focus rules.
It declares no brand and inherits the family orange.
That ratio - packages carrying the look, the app carrying meaning and placement - is the 80/20 target for every future sibling.

## Appendix

The component inventory - what is shared, what should be lifted into a future hardware-component package, and what stays app-specific - lives in [design-inventory.md](./design-inventory.md), together with the list of known deviations from this language.
