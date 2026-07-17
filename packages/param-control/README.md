# @haus/param-control

The descriptor-driven parameter-control layer for the instrument family, consumed as TypeScript source.
A `ParamDescriptor<T>` fully specifies a parameter's range, taper, stepping, polarity, default, and formatting; the headless engine (`useParamControl`), the unstyled `Knob` compound primitive, and the styled controls (`RotaryKnob`, `LinearSlider`, `ValueField`) all render and edit any descriptor through a canonical-units-only public API.

## Usage

```tsx
import { RotaryKnob, type ParamDescriptor } from "@haus/param-control";
```

Descriptor catalogs stay in each app: they name app-domain parameters and import app constants, so the app defines them against this package's model and passes them in.

The styled controls carry Tailwind utility classes that resolve against `@haus/tokens` (`--knob-*`, `--slider-track-*`, the `neu-tall` shadows, and friends).
The consuming app must import the token CSS in its Tailwind entry stylesheet (see the `@haus/tokens` README) and make sure its Tailwind build scans this package's source, e.g. in the app's entry stylesheet:

```css
@source "../../../../packages/param-control/src";
```

The rotary knob's first-use guidance coachmark is enabled by default.
An app with a degraded-performance mode can disable it by wrapping the tree in the provider:

```tsx
<CoachmarkProvider enabled={!degraded}>...</CoachmarkProvider>
```

## What belongs here

The parameter-control model and its presentations: tapers, the descriptor engine, the headless primitive, and the neumorphic styled controls, with no app-store or engine dependencies.
Descriptor catalogs (which parameters exist and their ranges) belong to the app that owns the parameters.
