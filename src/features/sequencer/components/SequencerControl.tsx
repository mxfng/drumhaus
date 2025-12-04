import { ComingSoonTooltipContent } from "@/shared/components/ComingSoonTooltipContent";
import { HardwareModule } from "@/shared/components/HardwareModule";
import { buttonActive } from "@/shared/lib/buttonActive";
import { cn } from "@/shared/lib/utils";
import { Button, Tooltip } from "@/shared/ui";
import { usePatternStore } from "../store/usePatternStore";
import { SequencerVariationButton } from "./SequencerVariationButton";
import { SequencerVariationPreview } from "./SequencerVariationPreview";

// Tooltip constants
const TOOLTIPS = {
  VARIATION_CHAIN_SET: "Program a variation chain",
  VARIATION_CHAIN_SAVE: "Store the current chain",
  VARIATION_CHAIN_TOGGLE_ON: "Play the variation chain",
  VARIATION_CHAIN_TOGGLE_OFF: "Play this variation only",

  VARIATION_A: "Variation A",
  VARIATION_B: "Variation B",
  VARIATION_C: "Variation C",
  VARIATION_D: "Variation D",

  COPY_TOGGLE_ON: "Enter copy mode and select a source",
  COPY_TOGGLE_OFF: "Exit copy mode",

  PASTE_TOGGLE_ON: "Enter paste mode and select a target",
  PASTE_TOGGLE_OFF: "Exit paste mode",

  CLEAR_TOGGLE_ON: "Enter clear mode and select a target",
  CLEAR_TOGGLE_OFF: "Exit clear mode",

  UNDO: "Undo the last change",
} as const;

/*
TODO: Add the remaining features

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
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const mode = usePatternStore((state) => state.mode);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const setMode = usePatternStore((state) => state.setMode);
  const setChainEnabled = usePatternStore((state) => state.setChainEnabled);
  const startChainEdit = usePatternStore((state) => state.startChainEdit);
  const setChain = usePatternStore((state) => state.setChain);
  const chainDraft = usePatternStore((state) => state.chainDraft);

  // const {
  //   variationCycle,
  //   setVariationCycle,
  //   copySequence,
  //   pasteSequence,
  //   clearSequence,
  //   randomSequence,
  // } = useSequencerControl();

  const isChainEdit = mode.type === "variationChain";

  const handleToggleChainEdit = () => {
    if (isChainEdit) {
      // On exit, commit the drafted chain only if something was punched in
      if (chainDraft.steps.length > 0) {
        setChain(chainDraft);
      }
      setMode({ type: "voice", voiceIndex });
      return;
    }
    startChainEdit();
  };

  const handleToggleChainEnabled = () => {
    setChainEnabled(!chainEnabled);
  };

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-4">
        {/* Variation chain and sequencer overview row */}
        <Tooltip
          content={
            isChainEdit
              ? TOOLTIPS.VARIATION_CHAIN_SAVE
              : TOOLTIPS.VARIATION_CHAIN_SET
          }
        >
          <Button
            variant="hardware"
            size="sm"
            className={cn(buttonActive(isChainEdit))}
            onClick={handleToggleChainEdit}
          >
            <span className="leading-3">vari chain</span>
          </Button>
        </Tooltip>
        <Tooltip
          content={
            chainEnabled
              ? TOOLTIPS.VARIATION_CHAIN_TOGGLE_OFF
              : TOOLTIPS.VARIATION_CHAIN_TOGGLE_ON
          }
        >
          <Button
            variant="hardware"
            size="sm"
            className={cn(buttonActive(chainEnabled))}
            onClick={handleToggleChainEnabled}
          >
            <span>chain on</span>
          </Button>
        </Tooltip>
        <div className="col-span-2">
          <SequencerVariationPreview variation={variation} />
        </div>

        {/* Variation pattern selection row */}
        <Tooltip content={TOOLTIPS.VARIATION_A} side="left">
          <SequencerVariationButton variation={0} />
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_B}>
          <SequencerVariationButton variation={1} />
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_C}>
          <SequencerVariationButton variation={2} />
        </Tooltip>
        <Tooltip content={TOOLTIPS.VARIATION_D}>
          <SequencerVariationButton variation={3} />
        </Tooltip>

        {/* Pattern actions row */}
        <Tooltip
          content={
            <ComingSoonTooltipContent tooltip={TOOLTIPS.COPY_TOGGLE_ON} />
          }
          side="bottom"
        >
          <Button variant="hardware" size="sm" className="opacity-50">
            <span>copy</span>
          </Button>
        </Tooltip>
        <Tooltip
          content={
            <ComingSoonTooltipContent tooltip={TOOLTIPS.PASTE_TOGGLE_ON} />
          }
          side="bottom"
        >
          <Button variant="hardware" size="sm" className="opacity-50">
            <span>paste</span>
          </Button>
        </Tooltip>
        <Tooltip
          content={
            <ComingSoonTooltipContent tooltip={TOOLTIPS.CLEAR_TOGGLE_ON} />
          }
          side="bottom"
        >
          <Button variant="hardware" size="sm" className="opacity-50">
            <span>clear</span>
          </Button>
        </Tooltip>
        <Tooltip
          content={<ComingSoonTooltipContent tooltip={TOOLTIPS.UNDO} />}
          side="bottom"
        >
          <Button variant="hardware" size="sm" className="opacity-50">
            <span>undo</span>
          </Button>
        </Tooltip>
      </div>
    </HardwareModule>
  );
};
