import React from "react";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { VariationBadge } from "@/features/sequencer/components/VariationBadge";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { ScreenBar } from "@/layout/ScreenBar";
import { MiniStepGrid } from "./MiniStepGrid";

export const FlamEditScreen: React.FC = () => {
  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);

  const voiceIndex = mode.type === "flam" ? mode.voiceIndex : 0;
  const flams = usePatternStore(
    (state) => state.pattern.voices[voiceIndex].variations[variation].flams,
  );
  const instrumentName = useInstrumentsStore(
    (state) => state.instruments[voiceIndex].meta.name,
  );

  if (mode.type !== "flam") {
    return null;
  }

  const flamCount = flams.filter(Boolean).length;

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center gap-1 px-5">
        {flamCount > 0 ? (
          <MiniStepGrid steps={flams} />
        ) : (
          <span className="-my-1 text-[10px] leading-3 normal-case">
            No flams set
            <br />
            Click steps in the sequencer to add flams
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p className="truncate">flam mode</p>
        <p className="inline-flex items-center gap-2">
          {instrumentName} <VariationBadge variation={variation} /> {flamCount}{" "}
          / 16{" "}
        </p>
      </ScreenBar>
    </div>
  );
};
