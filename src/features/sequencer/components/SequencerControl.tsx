import { HardwareModule } from "@/shared/components/HardwareModule";
import { usePerformanceStore } from "@/shared/store/usePerformanceStore";
import { Button, Tooltip } from "@/shared/ui";
import { usePatternStore } from "../store/usePatternStore";
import { SequencerVariationButton } from "./SequencerVariationButton";
import { SequencerVariationPreview } from "./SequencerVariationPreview";

// Tooltip constants
const TOOLTIPS = {
  VARIATION_CHAIN_SET: "Set variation chain",
  VARIATION_CHAIN_SAVE: "Save variation chain",
  VARIATION_CHAIN_TOGGLE_ON: "Toggle variation chain on",
  VARIATION_CHAIN_TOGGLE_OFF: "Toggle variation chain off",
  VARIATION_A: "Select variation A",
  VARIATION_B: "Select variation B",
  CYCLE_A: "Play only variation A",
  CYCLE_B: "Play only variation B",
  CYCLE_AB: "Alternate A and B each bar",
  CYCLE_AAAB: "Play A three times, then B",
  COPY: "Copy current sequence",
  PASTE: "Paste copied sequence",
  CLEAR: "Clear current sequence",
  RANDOM: "Generate random sequence",
} as const;

/*
TODO: Add the remaining features

Variation Chain (Vari Chain) — “Program a sequence of A/B/C/D patterns.”

Vari Chain lets the user build a custom playback sequence using the four variations (A, B, C, D). The user taps the Vari Chain button, then presses A/B/C/D in order to create a chain up to 8 steps long (e.g., A → A → C → D). When active, playback follows this chain instead of looping a single variation.

Purpose: Create longer phrases, evolving loops, and structured patterns.
Edit Mode: Press Vari Chain to enter chain-edit; tap variations to add; press again to exit.
Storage: Chain is saved per kit/pattern.
Max length: 8 slots (configurable).

Chain On — “Play the programmed chain instead of a single variation.”

Chain On toggles between two playback modes:

Chain Off: Loop the selected variation (A/B/C/D).

Chain On: Follow the chain sequence created with Vari Chain.

When Chain On is active, the sequencer advances through the chain and loops it continuously. Turning it off returns playback to the currently selected variation.

Purpose: Perform live, switch between loop vs phrase, control flow quickly.
Display: Highlighted state indicates chain playback is enabled.

Multi-Step Copy / Paste / Clear — “Command first, then choose the target.”

Copy, Paste, and Clear work on two levels: single instrument or entire variation, using a simple, hardware-like “verb then target” interaction.

Workflow:

Press COPY, PASTE, or CLEAR — the button waits for a target.

Tap a voice (instrument) to apply to that one instrument, or tap a variation button (A/B/C/D) to apply to the entire variation.

Operation completes and the button resets.

This keeps a minimal UI while enabling powerful pattern editing.

Copy:

Stores either:

A single instrument’s 16-step pattern (hits, velocities, flam, ratchet, nudge), or

A full variation (all voices + accent + groove data).

Paste:

Applies the copied data back onto:

A single instrument, or

A full variation.

Clear:

Removes:

All sequencing data from a single instrument, or

All sequencing data from an entire variation.

Purpose: Fast pattern shaping, duplicate variations, build fills, wipe mistakes.

Undo — “Revert the last edit on the current variation.”

Undo is a lightweight history system designed for hardware-like simplicity. It affects only sequencing edits within the currently selected variation, not global parameters.

Undoable actions:

Step on/off changes

Velocity edits

Flam toggles

Ratchet toggles

Accent toggles

Randomization

Nudge left/right

Copy/paste/clear operations on that variation

Non-undoable:

Tempo/swing changes

FX/parameter knob adjustments

Variation selection

Chain editing (optional depending on decision)

Behavior:

Press UNDO to restore the variation’s most recent pre-edit snapshot. Multiple undo levels can be supported, but even a single-level undo beautifully captures “oops, go back.”

Purpose: Prevent destructive mistakes without introducing DAW-like complexity.
Scope: Local to the current variation, never global.
 */
export const SequencerControl: React.FC = () => {
  const variation = usePatternStore((state) => state.variation);

  const potatoMode = usePerformanceStore((state) => state.potatoMode);

  // const {
  //   variationCycle,
  //   setVariationCycle,
  //   copySequence,
  //   pasteSequence,
  //   clearSequence,
  //   randomSequence,
  // } = useSequencerControl();

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-4">
        {/* Variation chain and sequencer overview row */}
        <Tooltip content={TOOLTIPS.VARIATION_CHAIN_SET}>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
          >
            <span className="leading-3">vari chain</span>
          </Button>
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_CHAIN_TOGGLE_ON}>
          <Button
            variant="hardware"
            size="sm"
            className="relative overflow-hidden"
          >
            <span>chain on</span>
          </Button>
        </Tooltip>
        <div className="col-span-2">
          {potatoMode ? (
            <div className="h-8 w-full" />
          ) : (
            <SequencerVariationPreview variation={variation} />
          )}
        </div>

        {/* Variation pattern selection row */}
        <Tooltip content={TOOLTIPS.VARIATION_A} side="left">
          <SequencerVariationButton variation={0} />
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_B}>
          <SequencerVariationButton variation={1} />
        </Tooltip>

        {/* mock for now */}
        <Button
          variant="hardware"
          className="font-pixel relative flex items-start justify-start overflow-hidden"
        >
          <span className="bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded">
            C
          </span>
        </Button>

        {/* mock for now */}
        <Button
          variant="hardware"
          className="font-pixel relative flex items-start justify-start overflow-hidden"
        >
          <span className="bg-foreground text-surface flex aspect-square h-5 w-5 items-center justify-center rounded">
            D
          </span>
        </Button>

        {/* Pattern actions row */}
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>copy</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>paste</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>clear</span>
        </Button>
        <Button
          variant="hardware"
          size="sm"
          className="relative overflow-hidden"
        >
          <span>undo</span>
        </Button>
      </div>
    </HardwareModule>
  );
};
