import { useCallback, useEffect, useRef, useState } from "react";

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
  waveformWidth?: number;
  waveformHeight?: number;
  runtime?: InstrumentRuntime;
  className?: string;
}

export const InstrumentHeader: React.FC<InstrumentHeaderProps> = ({
  index,
  color,
  waveformWidth,
  waveformHeight,
  runtime,
  className,
}) => {
  const waveButtonRef = useRef<HTMLButtonElement>(null);
  const [waveformError, setWaveformError] = useState<Error | null>(null);
  const [waveformLoaded, setWaveformLoaded] = useState(false);

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

  const handleWaveformLoad = useCallback(() => {
    setWaveformLoaded(true);
  }, []);

  // Reset waveform loaded state when sample changes
  useEffect(() => {
    queueMicrotask(() => {
      setWaveformLoaded(false);
      setWaveformError(null);
    });
  }, [samplePath]);

  return (
    <button
      ref={waveButtonRef}
      className={cn(
        "flex h-full w-full flex-col items-stretch gap-2 opacity-80 transition-opacity duration-300 hover:opacity-100",
        {
          "cursor-pointer": isRuntimeLoaded && !waveformError,
          "cursor-default": !isRuntimeLoaded || waveformError,
        },
        className,
      )}
      onMouseDown={playSample}
      disabled={!isRuntimeLoaded}
    >
      {/* Header */}
      <div className="flex w-full items-center gap-2 py-1 pl-4">
        <span className="font-pixel text-lg" style={{ color }}>
          {index + 1}
        </span>
        <Label className="text-foreground-emphasis font-pixel text-lg font-medium">
          {instrumentMeta.name}
        </Label>
      </div>

      {/* Waveform */}
      <div className="relative flex min-h-0 w-full flex-1 items-center justify-center overflow-visible px-4">
        {isRuntimeLoaded && waveformLoaded && !waveformError ? (
          <Waveform
            audioFile={samplePath}
            width={waveformWidth}
            height={waveformHeight}
            onError={handleWaveformError}
            onLoad={handleWaveformLoad}
          />
        ) : waveformError ? (
          <div className="flex h-full w-full items-center justify-center">
            <PixelatedFrowny color={color} />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {isRuntimeLoaded && !waveformLoaded && (
              <div className="absolute opacity-0">
                <Waveform
                  audioFile={samplePath}
                  width={waveformWidth}
                  height={waveformHeight}
                  onError={handleWaveformError}
                  onLoad={handleWaveformLoad}
                />
              </div>
            )}
            <PixelatedSpinner color={color} />
          </div>
        )}
      </div>
    </button>
  );
};
