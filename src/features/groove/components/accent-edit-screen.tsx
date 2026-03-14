import { VariationBadge } from "@/features/sequencer/components/variation-badge";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { ScreenBar } from "@/layout/screen-bar";
import { MiniStepGrid } from "./mini-step-grid";

function AccentEditScreen() {
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
        <div className="inline-flex items-center gap-2">
          <VariationBadge variation={variation} /> {accentCount} / 16{" "}
        </div>
      </ScreenBar>
    </div>
  );
}

export { AccentEditScreen };
