# @haus/ui

The shared component layer for the instrument family.
Radix-based primitives (button, dialog, dropdown menu, select, toast, tooltip, and friends), the `HardwareModule` chassis wrapper, and the `cn` class-merging helper, consumed as TypeScript source.

## Usage

```tsx
import { Button, cn, HardwareModule, ToastProvider } from "@haus/ui";
```

The components style themselves with Tailwind utility classes that resolve against `@haus/tokens`.
The consuming app must import the token CSS in its Tailwind entry stylesheet (see the `@haus/tokens` README) and make sure its Tailwind build scans this package's source, e.g. in the app's entry stylesheet:

```css
@source "../../../../packages/ui/src";
```

## What belongs here

Presentation-only primitives a sibling instrument would want: generic controls, overlays, and form fields with no instrument-domain logic or app-store dependencies.
Instrument-specific controls (sequencer, transport, param controls) stay in each app.
