import { ArrowLeft, ArrowRight } from "lucide-react";

import { TimingNudgeLeds } from "@/features/sequencer/components/TimingNudgeLeds";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import {
  HardwareModule,
  HardwareModuleSpacer,
} from "@/shared/components/HardwareModule";
import { cn } from "@/shared/lib/utils";
import { Button, Label } from "@/shared/ui";

export const GrooveControls = () => {
  const { pattern, voiceIndex, variation, nudgeTimingLeft, nudgeTimingRight } =
    usePatternStore();

  const currentNudge =
    pattern[voiceIndex]?.variations[variation]?.timingNudge ?? 0;
  const canNudgeLeft = currentNudge > -2;
  const canNudgeRight = currentNudge < 2;

  return (
    <div className="mx-auto w-5/6 px-4">
      <HardwareModule>
        <div className="grid grid-cols-3 place-items-center gap-x-2 gap-y-4">
          <Button
            variant="hardwareIcon"
            size="icon"
            className="relative overflow-hidden"
            onClick={nudgeTimingLeft}
            disabled={!canNudgeLeft}
          >
            <ArrowLeft size={12} />
          </Button>
          <Label className="flex items-center justify-center">nudge</Label>
          <Button
            variant="hardwareIcon"
            size="icon"
            className="relative overflow-hidden"
            onClick={nudgeTimingRight}
            disabled={!canNudgeRight}
          >
            <ArrowRight size={12} />
          </Button>
          <div className="col-span-3 flex items-center justify-center">
            <TimingNudgeLeds timingNudge={currentNudge} />
          </div>
          <div className="col-span-3 mx-auto">
            <Button
              variant="hardware"
              className="relative overflow-hidden"
              disabled
            >
              <span
                className={cn(
                  "border-foreground-muted group-hover:border-primary-muted rounded border border-dashed px-1 transition-colors duration-200",
                )}
              >
                accent
              </span>
            </Button>
          </div>
        </div>
        <HardwareModuleSpacer />
      </HardwareModule>
    </div>
  );
};
