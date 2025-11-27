import { useEffect } from "react";

import { useSampleDuration } from "@/hooks/useSampleDuration";
import { subscribeRuntimeToInstrumentParams } from "@/lib/audio/engine/instrumentParams";
import { cn } from "@/lib/utils";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { InstrumentHeader } from "./InstrumentHeader";
import { InstrumentParams } from "./InstrumentParams";

type InstrumentControlParams = {
  runtime?: InstrumentRuntime;
  color?: string;
  bg?: string;
  index: number;
  instrumentIndex: number;
  waveformWidth?: number;
  fillHeight?: boolean;
};

export const InstrumentControl: React.FC<InstrumentControlParams> = ({
  runtime,
  index,
  instrumentIndex,
  color = "currentColor",
  waveformWidth = 170,
  fillHeight = false,
  bg,
}) => {
  const samplePath = useInstrumentsStore(
    (state) => state.instruments[index].sample.path,
  );
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );
  const setDurationStore = useInstrumentsStore((state) => state.setDuration);

  const { duration: sampleDuration } = useSampleDuration(samplePath);

  useEffect(() => {
    if (!runtime) return;
    return subscribeRuntimeToInstrumentParams(index, runtime);
  }, [index, runtime]);

  useEffect(() => {
    setDurationStore(index, sampleDuration);
  }, [sampleDuration, index, setDurationStore]);

  return (
    <div
      className={cn(
        "group relative inset-0 h-[400px] w-full py-4 pt-4 transition-all duration-500",
        {
          "flex h-full flex-col": fillHeight,
        },
      )}
      style={{ backgroundColor: bg }}
      key={`Instrument-${instrumentMeta.id}-${index}`}
    >
      <div className="h-24">
        <InstrumentHeader
          index={index}
          color={color}
          waveformWidth={waveformWidth}
          runtime={runtime}
        />
      </div>

      <div className="h-40">
        <InstrumentParams
          index={index}
          instrumentIndex={instrumentIndex}
          fillHeight={fillHeight}
          runtime={runtime}
        />
      </div>
    </div>
  );
};
