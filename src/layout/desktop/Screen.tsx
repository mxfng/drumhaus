import { PresetControl } from "@/features/preset/components/PresetControl";
import { TempoControlsScreen } from "@/features/transport/components/TempoControlsScreen";
import FrequencyAnalyzer from "@/shared/components/FrequencyAnalyzer";

/*
TODO: Add remaining features

- Dynamic screen right column changes based on current mode (pattern, groove, etc.)
 */
export const Screen: React.FC = () => {
  return (
    <>
      {/* Screen Display */}
      <div className="bg-instrument border-border text-foreground col-span-4 overflow-clip rounded-2xl border">
        <div className="grid h-full w-full grid-cols-2 rounded-2xl">
          {/* Left Column - Equal heights */}
          <div className="border-foreground flex h-full flex-col border-r">
            <PresetControl />
          </div>

          {/* Right Column - 2/3 and 1/3 split */}
          <div className="flex h-full flex-col">
            <div className="border-foreground-emphasis relative h-2/3 min-h-0">
              <div className="absolute inset-0 pl-3">
                <FrequencyAnalyzer />
              </div>
            </div>
            <div className="h-1/3">
              <TempoControlsScreen />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
