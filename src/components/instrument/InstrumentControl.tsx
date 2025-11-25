import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Headphones, Volume, VolumeX } from "lucide-react";
import { now } from "tone/build/esm/index";

import { Button, Label, Tooltip } from "@/components/ui";
import { useSampleDuration } from "@/hooks/useSampleDuration";
import { playInstrumentSample } from "@/lib/audio/engine";
import { INSTRUMENT_PAN_RANGE } from "@/lib/audio/engine/constants";
import { subscribeRuntimeToInstrumentParams } from "@/lib/audio/engine/instrumentParams";
import { stopRuntimeAtTime } from "@/lib/audio/engine/runtimeStops";
import {
  instrumentAttackMapping,
  instrumentReleaseMapping,
  instrumentVolumeMapping,
  pitchMapping,
  splitFilterMapping,
} from "@/lib/knob/mapping";
import { cn } from "@/lib/utils";
import { useDialogStore } from "@/stores/useDialogStore";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { HardwareSlider } from "../common/HardwareSlider";
import ParamKnob from "../common/Knob";
import { PixelatedFrowny } from "../common/PixelatedFrowny";
import { PixelatedSpinner } from "../common/PixelatedSpinner";
import Waveform from "./Waveform";

type InstrumentControlParams = {
  runtime?: InstrumentRuntime;
  color?: string;
  bg?: string;
  index: number;
  instrumentIndex: number;
};

export const InstrumentControl: React.FC<InstrumentControlParams> = ({
  runtime,
  index,
  instrumentIndex,
  color = "#ff7b00",
  bg,
}) => {
  // Dialog store
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);

  // Use granular selectors
  const attack = useInstrumentsStore(
    (state) => state.instruments[index].params.attack,
  );
  const release = useInstrumentsStore(
    (state) => state.instruments[index].params.release,
  );
  const filter = useInstrumentsStore(
    (state) => state.instruments[index].params.filter,
  );
  const pan = useInstrumentsStore(
    (state) => state.instruments[index].params.pan,
  );
  const volume = useInstrumentsStore(
    (state) => state.instruments[index].params.volume,
  );
  const pitch = useInstrumentsStore(
    (state) => state.instruments[index].params.pitch,
  );
  const mute = useInstrumentsStore(
    (state) => state.instruments[index].params.mute,
  );
  const solo = useInstrumentsStore(
    (state) => state.instruments[index].params.solo,
  );

  const samplePath = useInstrumentsStore(
    (state) => state.instruments[index].sample.path,
  );
  const instrumentMeta = useInstrumentsStore(
    (state) => state.instruments[index].meta,
  );

  // Get store actions
  const setInstrumentProperty = useInstrumentsStore(
    (state) => state.setInstrumentProperty,
  );
  const setDurationStore = useInstrumentsStore((state) => state.setDuration);
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);

  const waveButtonRef = useRef<HTMLButtonElement>(null);

  const [waveformError, setWaveformError] = useState<Error | null>(null);
  const [trackedSamplePath, setTrackedSamplePath] = useState(samplePath);

  const { duration: sampleDuration } = useSampleDuration(samplePath);

  // Reset waveform error when sample path changes
  if (samplePath !== trackedSamplePath) {
    setTrackedSamplePath(samplePath);
    if (waveformError !== null) {
      setWaveformError(null);
    }
  }

  // Wrap store setters with instrument index
  const setAttack = useCallback(
    (value: number) => setInstrumentProperty(index, "attack", value),
    [index, setInstrumentProperty],
  );
  const setRelease = useCallback(
    (value: number) => setInstrumentProperty(index, "release", value),
    [index, setInstrumentProperty],
  );
  const setFilter = useCallback(
    (value: number) => setInstrumentProperty(index, "filter", value),
    [index, setInstrumentProperty],
  );
  const setPan = useCallback(
    (value: number) => setInstrumentProperty(index, "pan", value),
    [index, setInstrumentProperty],
  );
  const setVolume = useCallback(
    (value: number) => setInstrumentProperty(index, "volume", value),
    [index, setInstrumentProperty],
  );
  const setPitch = useCallback(
    (value: number) => setInstrumentProperty(index, "pitch", value),
    [index, setInstrumentProperty],
  );
  const toggleMute = useCallback(
    () => toggleMuteStore(index),
    [index, toggleMuteStore],
  );
  const toggleSolo = useCallback(
    () => toggleSoloStore(index),
    [index, toggleSoloStore],
  );

  const playSample = () => {
    if (!runtime) return;
    playInstrumentSample(runtime, pitch, release);
  };

  useEffect(() => {
    if (!runtime) return;
    return subscribeRuntimeToInstrumentParams(index, runtime);
  }, [index, runtime]);
  const isRuntimeLoaded = useMemo(() => !!runtime, [runtime]);
  const handleWaveformError = useCallback((error: Error) => {
    setWaveformError(error);
  }, []);

  useEffect(() => {
    setDurationStore(index, sampleDuration);
  }, [sampleDuration, index, setDurationStore]);

  const handleToggleMute = useCallback(() => {
    if (!mute && runtime?.samplerNode) {
      stopRuntimeAtTime(runtime, now());
    }
    toggleMute();
  }, [toggleMute, mute, runtime]);

  useEffect(() => {
    const muteOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "m" && !isAnyDialogOpen() && instrumentIndex == index) {
        handleToggleMute();
      }
    };

    window.addEventListener("keydown", muteOnKeyInput);
    return () => {
      window.removeEventListener("keydown", muteOnKeyInput);
    };
  }, [instrumentIndex, index, handleToggleMute, isAnyDialogOpen]);

  useEffect(() => {
    const soloOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "s" && !isAnyDialogOpen() && instrumentIndex == index) {
        toggleSolo();
      }
    };

    window.addEventListener("keydown", soloOnKeyInput);
    return () => {
      window.removeEventListener("keydown", soloOnKeyInput);
    };
  }, [instrumentIndex, index, toggleSolo, isAnyDialogOpen]);

  return (
    <div
      className={cn(
        "group relative mt-2 w-full py-4 transition-all duration-500",
        {
          "cursor-pointer": isRuntimeLoaded && !waveformError,
        },
      )}
      style={{ backgroundColor: bg }}
      key={`Instrument-${instrumentMeta.id}-${index}`}
    >
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
              width={170}
              onError={handleWaveformError}
            />
          ) : waveformError ? (
            <PixelatedFrowny color={color} />
          ) : (
            <PixelatedSpinner color={color} />
          )}
        </button>
      </div>

      {/* Controls */}
      <div className={isRuntimeLoaded ? "opacity-100" : "opacity-50"}>
        {/* Top knobs - 2x2 grid */}
        <div className="grid grid-cols-2">
          <ParamKnob
            value={attack}
            onValueChange={setAttack}
            label="ATTACK"
            mapping={instrumentAttackMapping}
          />
          <ParamKnob
            value={filter}
            onValueChange={setFilter}
            label="FILTER"
            mapping={splitFilterMapping}
            outerTickCount={3}
          />
          <ParamKnob
            value={release}
            onValueChange={setRelease}
            label="RELEASE"
            mapping={instrumentReleaseMapping}
          />
          <ParamKnob
            value={pitch}
            onValueChange={setPitch}
            label="PITCH"
            mapping={pitchMapping}
            outerTickCount={25}
          />
          <div className="flex flex-col items-center justify-between pt-4">
            <HardwareSlider
              size={85}
              sliderValue={pan}
              setSliderValue={setPan}
              defaultValue={50}
              leftLabel="L"
              centerLabel="|"
              rightLabel="R"
              transformRange={INSTRUMENT_PAN_RANGE}
              displayRange={[-100, 100]}
              isDisabled={!isRuntimeLoaded}
            />
            <div className="hardware-button-group flex rounded-lg">
              <Tooltip content="Mute [M]" delayDuration={500}>
                <Button
                  variant="hardware"
                  size="sm"
                  className={cn("w-8 rounded-l-lg rounded-r-none p-2 text-lg", {
                    "text-primary": mute,
                  })}
                  title="Mute"
                  onClick={handleToggleMute}
                  disabled={!isRuntimeLoaded}
                >
                  {mute ? <VolumeX /> : <Volume />}
                </Button>
              </Tooltip>
              <Tooltip content="Solo [S]" delayDuration={500}>
                <Button
                  variant="hardware"
                  size="sm"
                  className={cn("w-8 rounded-l-none rounded-r-lg p-0", {
                    "text-primary": solo,
                  })}
                  title="Solo"
                  onClick={toggleSolo}
                  disabled={!isRuntimeLoaded}
                >
                  <Headphones
                    className={cn({ "text-primary": solo })}
                    size={18}
                  />
                </Button>
              </Tooltip>
            </div>
          </div>
          {/* Right: Volume */}
          <ParamKnob
            value={volume}
            onValueChange={setVolume}
            label="LEVEL"
            mapping={instrumentVolumeMapping}
            outerTickCount={13}
          />
        </div>
      </div>
    </div>
  );
};
