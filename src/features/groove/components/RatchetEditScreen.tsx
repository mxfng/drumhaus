import React from "react";

import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { VariationBadge } from "@/features/sequencer/components/VariationBadge";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { ScreenBar } from "@/layout/ScreenBar";
import { MiniStepGrid } from "./MiniStepGrid";

export const RatchetEditScreen: React.FC = () => {
  const mode = usePatternStore((state) => state.mode);
  const variation = usePatternStore((state) => state.variation);

  const voiceIndex = mode.type === "ratchet" ? mode.voiceIndex : 0;
  const ratchets = usePatternStore(
    (state) => state.pattern.voices[voiceIndex].variations[variation].ratchets,
  );
  const instrumentName = useInstrumentsStore(
    (state) => state.instruments[voiceIndex].meta.name,
  );

  if (mode.type !== "ratchet") {
    return null;
  }

  const ratchetCount = ratchets.filter(Boolean).length;

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center gap-1 px-5">
        {ratchetCount > 0 ? (
          <MiniStepGrid steps={ratchets} />
        ) : (
          <span className="-my-1 text-[10px] leading-3 normal-case">
            No ratchets set
            <br />
            Click steps in the sequencer to add ratchets
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p className="truncate">ratchet mode</p>
        <p className="inline-flex items-center gap-2">
          {instrumentName} <VariationBadge variation={variation} />{" "}
          {ratchetCount} / 16{" "}
        </p>
      </ScreenBar>
    </div>
  );
};
