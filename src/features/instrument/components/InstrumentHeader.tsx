import { useCallback, useRef } from "react";

import { triggerInstrument } from "@/core/audio/engine";
import type { InstrumentRuntime } from "@/core/audio/engine/instrument/types";
import { cn } from "@/shared/lib/utils";
import { useWaveformData, Waveform } from "@/shared/waveform";
import { useInstrumentsStore } from "../store/useInstrumentsStore";

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

  // Get waveform error state from provider
  const { error: waveformError } = useWaveformData(samplePath);

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

    await triggerInstrument(runtime, tune, decay);
  }, [onInteract, runtime, tune, decay]);

  return (
    <button
      ref={waveButtonRef}
      className={cn(
        "focus-ring flex h-full w-full flex-col items-stretch gap-2 rounded-2xl border border-transparent px-4 py-2",
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
      <div className="flex w-full items-center gap-1.5">
        <span className="font-pixel text-sm" style={{ color }}>
          {index + 1}
        </span>
        <span className="text-foreground-emphasis font-pixel text-sm">
          {instrumentMeta.name}
        </span>
      </div>

      {/* Waveform */}
      <div className="relative flex h-6 flex-1 items-center justify-center overflow-visible">
        <Waveform
          audioFile={samplePath}
          width={waveformWidth}
          height={waveformHeight}
          color={color}
          isLoading={!isRuntimeLoaded}
          className="h-6"
        />
      </div>
    </button>
  );
};
