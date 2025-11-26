import { cn } from "@/lib/utils";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import { usePatternStore } from "@/stores/usePatternStore";

const INSTRUMENT_COLORS = [
  "#213062",
  "#e9902f",
  "#d72529",
  "#27991a",
  "#213062",
  "#e9902f",
  "#d72529",
  "#27991a",
];

export const MobileInstrumentSelector: React.FC = () => {
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const setVoiceIndex = usePatternStore((state) => state.setVoiceIndex);
  const instruments = useInstrumentsStore((state) => state.instruments);

  return (
    <div className="border-border grid grid-cols-8 border-t">
      {Array.from({ length: 8 }).map((_, index) => {
        const instrument = instruments[index];
        const isActive = voiceIndex === index;

        return (
          <button
            key={index}
            onClick={() => setVoiceIndex(index)}
            className={cn(
              "border-border relative flex flex-col items-center border-r py-3 text-xs transition-colors last:border-r-0",
              isActive ? "bg-surface" : "bg-surface-muted hover:bg-surface",
            )}
            style={{
              borderTopColor: isActive
                ? INSTRUMENT_COLORS[index]
                : "transparent",
              borderTopWidth: isActive ? "3px" : "0",
            }}
          >
            <span
              className="font-pixel text-sm"
              style={{ color: INSTRUMENT_COLORS[index] }}
            >
              {index + 1}
            </span>
            <span className="text-foreground-muted mt-1 truncate text-[10px] leading-tight">
              {instrument.meta.name.slice(0, 4)}
            </span>
          </button>
        );
      })}
    </div>
  );
};
