import { useInstrumentsStore } from "../store/useInstrumentsStore";
import { InstrumentRuntime } from "../types/instrument";
import { InstrumentHeader } from "./InstrumentHeader";
import { InstrumentParamsControl } from "./InstrumentParamsControl";

type InstrumentControlParams = {
  runtime?: InstrumentRuntime;
  color?: string;
  index: number;
  instrumentIndex: number;
  waveformWidth?: number;
};

export const InstrumentControl: React.FC<InstrumentControlParams> = ({
  runtime,
  index,
  instrumentIndex,
  color = "currentColor",
  waveformWidth,
}) => {
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );

  return (
    <div
      className="group flex h-full w-full flex-col"
      key={`Instrument-${instrumentMeta.id}-${index}`}
    >
      <div className="mx-4 mb-4">
        <InstrumentHeader
          index={index}
          color={color}
          waveformWidth={waveformWidth}
          runtime={runtime}
        />
      </div>

      <div>
        <InstrumentParamsControl
          index={index}
          instrumentIndex={instrumentIndex}
          runtime={runtime}
        />
      </div>
    </div>
  );
};
