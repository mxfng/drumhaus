import { useRef } from "react";

import {
  Coachmark,
  CoachmarkContent,
  CoachmarkDismissTitle,
} from "@/shared/components/Coachmark";
import { ComingSoonTooltipContent } from "@/shared/components/ComingSoonTooltipContent";
import { HardwareModule } from "@/shared/components/HardwareModule";
import { useCoachmark } from "@/shared/hooks/useCoachmark";
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

const VARIATION_CHAIN_COACHMARK_DURATION_MS = 20000;

/*
TODO: Add the remaining control features
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

  const variChainButtonRef = useRef<HTMLButtonElement>(null);
  const { showCoachmark, triggerCoachmark, dismissCoachmark } = useCoachmark({
    storageKey: "coachmark-shown-variation-chain-mode",
    duration: VARIATION_CHAIN_COACHMARK_DURATION_MS,
  });

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
    // Trigger coachmark on first use
    triggerCoachmark();
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
            ref={variChainButtonRef}
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
          delayDuration={0}
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
          delayDuration={0}
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
          delayDuration={0}
        >
          <Button variant="hardware" size="sm" className="opacity-50">
            <span>clear</span>
          </Button>
        </Tooltip>
        <Tooltip
          content={<ComingSoonTooltipContent tooltip={TOOLTIPS.UNDO} />}
          side="bottom"
          delayDuration={0}
        >
          <Button variant="hardware" size="sm" className="opacity-50">
            <span>undo</span>
          </Button>
        </Tooltip>
      </div>
      <Coachmark
        visible={showCoachmark}
        message={
          <>
            <CoachmarkDismissTitle className="text-base font-semibold">
              Variation Chain Mode
            </CoachmarkDismissTitle>
            <CoachmarkContent>
              <p>Create a custom play order (e.g., A → B → A → D).</p>
              <p>
                Tap A/B/C/D in the order you want, then tap <b>Vari Chain</b>{" "}
                again to save.
              </p>
              <p>
                Enable <b>Chain On</b> to hear the sequence during playback.
              </p>
            </CoachmarkContent>
          </>
        }
        anchorRef={variChainButtonRef}
        onDismiss={dismissCoachmark}
      />
    </HardwareModule>
  );
};
