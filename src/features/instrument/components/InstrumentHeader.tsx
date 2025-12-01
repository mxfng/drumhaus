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

  const samplePath = useInstrumentsStore(
    (state) => state.instruments[index].sample.path,
  );
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );
  const tune = useInstrumentsStore(
    (state) => state.instruments[index].params.tune,
  );
  const decay = useInstrumentsStore(
    (state) => state.instruments[index].params.decay,
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

    await playInstrumentSample(runtime, tune, decay);
  }, [onInteract, runtime, tune, decay]);

  const handleWaveformError = useCallback((error: Error) => {
    setWaveformError(error);
  }, []);

  // Reset waveform loaded state when sample changes
  useEffect(() => {
    queueMicrotask(() => {
      setWaveformError(null);
    });
  }, [samplePath]);

  return (
    <button
      ref={waveButtonRef}
      className={cn(
        "flex h-full w-full items-stretch gap-4 opacity-80 transition-opacity duration-300 hover:opacity-100",
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
      <div className="flex w-1/3 items-center gap-1.5">
        <span className="font-pixel" style={{ color }}>
          {index + 1}
        </span>
        <Label className="text-foreground-emphasis font-pixel text-base">
          {instrumentMeta.name}
        </Label>
      </div>

      {/* Waveform */}
      <div className="relative flex w-2/3 flex-1 items-center justify-center overflow-visible">
        {waveformError ? (
          <PixelatedFrowny color={color} />
        ) : isRuntimeLoaded ? (
          <Waveform
            audioFile={samplePath}
            width={waveformWidth}
            height={waveformHeight}
            onError={handleWaveformError}
          />
        ) : (
          <PixelatedSpinner color={color} />
        )}
      </div>
    </button>
  );
};
