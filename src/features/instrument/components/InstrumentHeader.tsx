import { useCallback, useEffect, useRef, useState } from "react";

import { playInstrumentSample } from "@/core/audio/engine";
import { PixelatedFrowny } from "@/shared/components/PixelatedFrowny";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import Waveform from "@/shared/components/Waveform";
import { cn } from "@/shared/lib/utils";
import { Label } from "@/shared/ui";
import { useInstrumentsStore } from "../store/useInstrumentsStore";
import { InstrumentRuntime } from "../types/instrument";

interface InstrumentHeaderProps {
  index: number;
  color: string;
  waveformWidth?: number;
  waveformHeight?: number;
  runtime?: InstrumentRuntime;
  className?: string;
  /** Optional override */
  onInteract?: () => void;
}

export const InstrumentHeader: React.FC<InstrumentHeaderProps> = ({
  index,
  color,
  waveformWidth,
  waveformHeight,
  runtime,
  className,
  onInteract,
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

  /**
   * Play the sample or trigger custom callback interaction
   */
  const playSample = useCallback(async () => {
    if (!runtime) return;

    if (onInteract) {
      onInteract();
      return;
    }

    await playInstrumentSample(runtime, pitch, release);
  }, [onInteract, runtime, pitch, release]);

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
      onPointerDown={() => {
        void playSample();
      }}
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
