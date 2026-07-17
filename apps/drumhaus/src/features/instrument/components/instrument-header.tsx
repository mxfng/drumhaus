import { useCallback, useRef } from "react";

import { useChannelReady } from "@/core/audio/bridge/use-kit-version";
import { getAudioEngine } from "@/core/audio/engine";
import { cn } from "@/shared/lib/utils";
import { useWaveformData, Waveform } from "@/shared/waveform";
import { useInstrumentsStore } from "../store/use-instruments-store";

interface InstrumentHeaderProps {
  index: number;
  color: string;
  waveformWidth?: number;
  waveformHeight?: number;
  className?: string;
  /** Optional override */
  onInteract?: () => void;
}

function InstrumentHeader({
  index,
  color,
  waveformWidth,
  waveformHeight,
  className,
  onInteract,
}: InstrumentHeaderProps) {
  const waveButtonRef = useRef<HTMLButtonElement>(null);

  const samplePath = useInstrumentsStore(
    (state) => state.instruments[index].sample.path,
  );
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );

  // Get waveform error state from provider
  const { error: waveformError } = useWaveformData(samplePath);

  // Refreshed on every kit load so readiness reflects the active channels
  const isChannelReady = useChannelReady(index);

  /**
   * Play the sample or trigger custom callback interaction
   */
  const playSample = useCallback(() => {
    if (!getAudioEngine().isChannelReady(index)) return;

    if (onInteract) {
      onInteract();
      return;
    }

    // Preview uses the channel's last-pushed play params (domain values)
    getAudioEngine().previewChannel(index);
  }, [onInteract, index]);

  return (
    <button
      ref={waveButtonRef}
      className={cn(
        "focus-ring flex h-full w-full flex-col items-stretch gap-2 rounded-2xl border border-transparent px-4 py-2",
        {
          "cursor-pointer": isChannelReady && !waveformError,
          "cursor-default": !isChannelReady || waveformError,
        },
        className,
      )}
      onPointerDown={() => {
        playSample();
      }}
      disabled={!isChannelReady}
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
          isLoading={!isChannelReady}
          className="h-6"
        />
      </div>
    </button>
  );
}

export { InstrumentHeader };
