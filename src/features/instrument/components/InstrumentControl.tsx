import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { cn } from "@/shared/lib/utils";
import { useInstrumentsStore } from "../store/useInstrumentsStore";
import { InstrumentRuntime } from "../types/instrument";
import { InstrumentHeader } from "./InstrumentHeader";
import { InstrumentParamsControl } from "./InstrumentParamsControl";

type InstrumentControlParams = {
  runtime?: InstrumentRuntime;
  color?: string;
  index: number;
  waveformWidth?: number;
};

export const InstrumentControl: React.FC<InstrumentControlParams> = ({
  runtime,
  index,
  color = "currentColor",
  waveformWidth,
}) => {
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );

  const isSelectedInstrument = usePatternStore(
    (state) => state.voiceIndex === index,
  );

  return (
    <div
      className={cn(
        "group flex h-full w-full flex-col rounded-2xl border border-transparent",
        {
          "cursor-pointer": runtime,
          "cursor-default": !runtime,
        },
        isSelectedInstrument && "border-primary-foreground/80 bg-primary/5",
      )}
      key={`Instrument-${instrumentMeta.id}-${index}`}
    >
      <div className="mb-2">
        <InstrumentHeader
          index={index}
          color={color}
          waveformWidth={waveformWidth}
          runtime={runtime}
        />
      </div>

      <div className="mb-2">
        <InstrumentParamsControl index={index} runtime={runtime} />
      </div>
    </div>
  );
};
