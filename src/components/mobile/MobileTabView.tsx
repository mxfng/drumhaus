import { SequencerControl } from "@/components/controls/SequencerControl";
import { InstrumentControl } from "@/components/instrument/InstrumentControl";
import { Sequencer } from "@/components/Sequencer";
import { cn } from "@/lib/utils";
import { usePatternStore } from "@/stores/usePatternStore";
import type { InstrumentRuntime } from "@/types/instrument";

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

export type TabType = "instrument" | "controls";

interface MobileTabViewProps {
  instrumentRuntimes: InstrumentRuntime[];
  instrumentRuntimesVersion: number;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

export const MobileTabView: React.FC<MobileTabViewProps> = ({
  instrumentRuntimes,
  instrumentRuntimesVersion,
  activeTab,
  setActiveTab,
}) => {
  const voiceIndex = usePatternStore((state) => state.voiceIndex);

  return (
    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-hidden">
      {/* Tabs */}
      <div className="border-border flex border-b">
        <button
          onClick={() => setActiveTab("instrument")}
          className={cn(
            "border-border flex-1 border-r px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "instrument"
              ? "bg-surface text-foreground-emphasis"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          INSTRUMENT
        </button>
        <button
          onClick={() => setActiveTab("controls")}
          className={cn(
            "flex-1 px-4 py-3 text-sm font-medium transition-colors",
            activeTab === "controls"
              ? "bg-surface text-foreground-emphasis"
              : "bg-surface-muted text-foreground-muted hover:bg-surface",
          )}
        >
          CONTROLS
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto">
        {activeTab === "instrument" && (
          <div className="bg-surface-raised">
            <InstrumentControl
              key={`mobile-instrument-${voiceIndex}-${instrumentRuntimesVersion}`}
              runtime={instrumentRuntimes[voiceIndex]}
              index={voiceIndex}
              instrumentIndex={voiceIndex}
              color={INSTRUMENT_COLORS[voiceIndex]}
              bg="#E8E3DD"
            />
          </div>
        )}

        {activeTab === "controls" && (
          <div className="bg-surface flex flex-col gap-4 p-4">
            <SequencerControl />
            <Sequencer />
          </div>
        )}
      </div>
    </div>
  );
};
