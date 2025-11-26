import { useCallback, useRef, useState } from "react";

import { Label } from "@/components/ui";
import { playInstrumentSample } from "@/lib/audio/engine";
import { cn } from "@/lib/utils";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { PixelatedFrowny } from "../common/PixelatedFrowny";
import { PixelatedSpinner } from "../common/PixelatedSpinner";
import Waveform from "./Waveform";

interface InstrumentHeaderProps {
  index: number;
  color: string;
  waveformWidth: number;
  runtime?: InstrumentRuntime;
}

export const InstrumentHeader: React.FC<InstrumentHeaderProps> = ({
  index,
  color,
  waveformWidth,
  runtime,
}) => {
  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const [waveformError, setWaveformError] = useState<Error | null>(null);

  const samplePath = useInstrumentsStore(
    (state) => state.instruments[index].sample.path,
  );
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );
  const pitch = useInstrumentsStore(
    (state) => state.instruments[index].params.pitch,
  );
  const release = useInstrumentsStore(
    (state) => state.instruments[index].params.release,
  );

  const isRuntimeLoaded = !!runtime;

  const playSample = useCallback(() => {
    if (!runtime) return;
    playInstrumentSample(runtime, pitch, release);
  }, [runtime, pitch, release]);

  const handleWaveformError = useCallback((error: Error) => {
    setWaveformError(error);
  }, []);

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-2 px-4">
        <span className="font-pixel text-lg" style={{ color }}>
          {index + 1}
        </span>
        <Label className="text-foreground-emphasis font-pixel text-lg font-medium">
          {instrumentMeta.name}
        </Label>
      </div>

      {/* Waveform */}
      <div className="overflow-visible px-4 pt-2">
        <button
          ref={waveButtonRef}
          className={cn(
            "flex h-[60px] w-full items-center justify-center opacity-80 transition-opacity duration-300 group-hover:opacity-100",
            {
              "cursor-pointer": isRuntimeLoaded && !waveformError,
            },
          )}
          onMouseDown={playSample}
          disabled={!isRuntimeLoaded}
        >
          {isRuntimeLoaded && !waveformError ? (
            <Waveform
              audioFile={samplePath}
              width={waveformWidth}
              onError={handleWaveformError}
            />
          ) : waveformError ? (
            <PixelatedFrowny color={color} />
          ) : (
            <PixelatedSpinner color={color} />
          )}
        </button>
      </div>
    </>
  );
};
