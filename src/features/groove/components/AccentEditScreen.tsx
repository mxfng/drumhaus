import { VariationBadge } from "@/features/sequencer/components/VariationBadge";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { ScreenBar } from "@/layout/ScreenBar";
import { MiniStepGrid } from "./MiniStepGrid";

export const AccentEditScreen: React.FC = () => {
  const variation = usePatternStore((state) => state.variation);
  const accents = usePatternStore(
    (state) => state.pattern.variationMetadata[variation].accent,
  );

  const accentCount = accents.filter(Boolean).length;

  return (
    <div className="bg-screen flex h-full flex-col gap-1 pt-1">
      <div className="flex flex-1 items-center gap-1 px-5">
        {accentCount > 0 ? (
          <MiniStepGrid steps={accents} />
        ) : (
          <span className="-my-1 text-[10px] leading-3 normal-case">
            No accents set
            <br />
            Click steps in the sequencer to add accents
          </span>
        )}
      </div>

      <ScreenBar className="flex flex-row justify-between">
        <p>accent mode</p>
        <p className="inline-flex items-center gap-2">
          <VariationBadge variation={variation} /> {accentCount} / 16{" "}
        </p>
      </ScreenBar>
    </div>
  );
};
