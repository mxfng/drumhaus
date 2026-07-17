import {
  Button,
  HardwareModule,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@haus/ui";

import { redo, undo } from "@/features/preset/history/history";
import { useHistoryStore } from "@/features/preset/history/use-history-store";
import { useShiftHeld } from "@/shared/hooks/use-shift-held";
import { buttonActive } from "@/shared/lib/button-active";
import { interactableHighlight } from "@/shared/lib/interactable-highlight";
import { cn } from "@/shared/lib/utils";
import { usePatternStore } from "../store/use-pattern-store";
import { SequencerVariationButton } from "./sequencer-variation-button";
import { SequencerVariationPreview } from "./sequencer-variation-preview";

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

  UNDO: "Undo the last change - hold shift to redo",
  REDO: "Redo the last undone change",
} as const;

function SequencerControl() {
  const variation = usePatternStore((state) => state.variation);
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const mode = usePatternStore((state) => state.mode);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const setMode = usePatternStore((state) => state.setMode);
  const setChainEnabled = usePatternStore((state) => state.setChainEnabled);
  const startChainEdit = usePatternStore((state) => state.startChainEdit);
  const setChain = usePatternStore((state) => state.setChain);
  const chainDraft = usePatternStore((state) => state.chainDraft);

  // Copy/paste state
  const clipboard = usePatternStore((state) => state.clipboard);
  const enterCopyMode = usePatternStore((state) => state.enterCopyMode);
  const togglePasteMode = usePatternStore((state) => state.togglePasteMode);
  const exitCopyPasteMode = usePatternStore((state) => state.exitCopyPasteMode);
  const toggleClearMode = usePatternStore((state) => state.toggleClearMode);

  // Undo/redo: the single hardware button follows the MPC/Push convention -
  // holding shift flips it to redo (#240).
  const canUndo = useHistoryStore((state) => state.past.length > 0);
  const canRedo = useHistoryStore((state) => state.future.length > 0);
  const isShiftHeld = useShiftHeld();

  const isChainEdit = mode.type === "variationChain";
  const isCopyMode = mode.type === "copy";
  const isPasteMode = mode.type === "paste";
  const isClearMode = mode.type === "clear";
  const hasClipboard = clipboard !== null;

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

  const handleCopyClick = () => {
    if (isPasteMode) {
      enterCopyMode();
      return;
    }
    if (isCopyMode) {
      exitCopyPasteMode();
      return;
    }
    enterCopyMode();
  };

  const handlePasteClick = () => {
    togglePasteMode();
  };

  const handleClearClick = () => {
    toggleClearMode();
  };

  return (
    <HardwareModule>
      <div className="grid w-full grid-cols-4 gap-x-2 gap-y-4">
        {/* Variation chain and sequencer overview row */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              className={cn(
                buttonActive(isChainEdit),
                interactableHighlight(isChainEdit),
              )}
              onClick={handleToggleChainEdit}
            >
              <span className="leading-3">vari chain</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isChainEdit
              ? TOOLTIPS.VARIATION_CHAIN_SAVE
              : TOOLTIPS.VARIATION_CHAIN_SET}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              className={cn(buttonActive(chainEnabled))}
              onClick={handleToggleChainEnabled}
            >
              <span>chain on</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {chainEnabled
              ? TOOLTIPS.VARIATION_CHAIN_TOGGLE_OFF
              : TOOLTIPS.VARIATION_CHAIN_TOGGLE_ON}
          </TooltipContent>
        </Tooltip>
        <div className="col-span-2">
          <SequencerVariationPreview variation={variation} />
        </div>

        {/* Variation pattern selection row */}
        <Tooltip>
          <TooltipTrigger asChild>
            <SequencerVariationButton variation={0} />
          </TooltipTrigger>
          <TooltipContent side="left">{TOOLTIPS.VARIATION_A}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <SequencerVariationButton variation={1} />
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.VARIATION_B}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <SequencerVariationButton variation={2} />
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.VARIATION_C}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <SequencerVariationButton variation={3} />
          </TooltipTrigger>
          <TooltipContent>{TOOLTIPS.VARIATION_D}</TooltipContent>
        </Tooltip>

        {/* Pattern actions row */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              className={cn(
                buttonActive(isCopyMode),
                interactableHighlight(isCopyMode),
              )}
              onClick={handleCopyClick}
            >
              <span>copy</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isCopyMode ? TOOLTIPS.COPY_TOGGLE_OFF : TOOLTIPS.COPY_TOGGLE_ON}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              className={cn(
                buttonActive(isPasteMode),
                interactableHighlight(isPasteMode),
              )}
              onClick={handlePasteClick}
              disabled={!hasClipboard}
            >
              <span>paste</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isPasteMode ? TOOLTIPS.PASTE_TOGGLE_OFF : TOOLTIPS.PASTE_TOGGLE_ON}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              className={cn(
                buttonActive(isClearMode),
                interactableHighlight(isClearMode),
              )}
              onClick={handleClearClick}
            >
              <span>clear</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isClearMode ? TOOLTIPS.CLEAR_TOGGLE_OFF : TOOLTIPS.CLEAR_TOGGLE_ON}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="hardware"
              size="sm"
              onClick={(event) => {
                if (event.shiftKey) {
                  redo();
                } else {
                  undo();
                }
              }}
              disabled={isShiftHeld ? !canRedo : !canUndo}
            >
              <span>{isShiftHeld ? "redo" : "undo"}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {isShiftHeld ? TOOLTIPS.REDO : TOOLTIPS.UNDO}
          </TooltipContent>
        </Tooltip>
      </div>
    </HardwareModule>
  );
}

export { SequencerControl };
