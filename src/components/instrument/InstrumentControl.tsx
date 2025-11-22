import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImVolumeMute, ImVolumeMute2 } from "react-icons/im";
import { MdHeadphones } from "react-icons/md";
import { now } from "tone/build/esm/index";

import { Button, Label, Tooltip } from "@/components/ui";
import { useSampleDuration } from "@/hooks/useSampleDuration";
import { playInstrumentSample } from "@/lib/audio/engine";
import {
  INSTRUMENT_ATTACK_RANGE,
  INSTRUMENT_PAN_RANGE,
  INSTRUMENT_PITCH_SEMITONE_RANGE,
  INSTRUMENT_RELEASE_RANGE,
  INSTRUMENT_VOLUME_RANGE,
} from "@/lib/audio/engine/constants";
import { subscribeRuntimeToInstrumentParams } from "@/lib/audio/engine/instrumentParams";
import { PITCH_KNOB_STEP } from "@/lib/audio/engine/pitch";
import { stopRuntimeAtTime } from "@/lib/audio/engine/runtimeStops";
import { cn } from "@/lib/utils";
import { useDialogStore } from "@/stores/useDialogStore";
import { useInstrumentsStore } from "@/stores/useInstrumentsStore";
import type { InstrumentRuntime } from "@/types/instrument";
import { CustomSlider } from "../common/CustomSlider";
import { Knob } from "../common/Knob";
import {
  transformKnobValue,
  transformKnobValueExponential,
} from "../common/knobTransforms";
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
  const { duration: sampleDuration } = useSampleDuration(samplePath);
  const [waveformError, setWaveformError] = useState<Error | null>(null);
  const [trackedSamplePath, setTrackedSamplePath] = useState(samplePath);

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

  const formatPitchLabel = useCallback((value: number) => {
    const semitoneOffset =
      ((value - 50) / 50) * INSTRUMENT_PITCH_SEMITONE_RANGE;
    const signedOffset =
      semitoneOffset > 0
        ? `+${semitoneOffset.toFixed(0)}`
        : semitoneOffset.toFixed(0);
    return `${signedOffset} st`;
  }, []);

  const formatDurationLabel = useCallback((seconds: number) => {
    if (!seconds || !Number.isFinite(seconds)) return "0 ms";
    if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
    if (seconds < 10) return `${seconds.toFixed(2)} s`;
    return `${seconds.toFixed(1)} s`;
  }, []);

  const formatAttackLabel = useCallback(
    (value: number) => {
      const attackSeconds = transformKnobValue(value, INSTRUMENT_ATTACK_RANGE);
      return formatDurationLabel(attackSeconds);
    },
    [formatDurationLabel],
  );

  const formatReleaseLabel = useCallback(
    (value: number) => {
      const releaseSeconds = transformKnobValueExponential(
        value,
        INSTRUMENT_RELEASE_RANGE,
      );
      return formatDurationLabel(releaseSeconds);
    },
    [formatDurationLabel],
  );

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

  const playSample = () => {
    if (!runtime) return;
    playInstrumentSample(runtime, pitch, release);
  };

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
        <Label className="text-foreground-emphasis text-lg font-medium">
          {instrumentMeta.name}
        </Label>
      </div>

      {/* Waveform */}
      <div className="overflow-visible px-4 pt-5">
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
        <div className="grid grid-cols-2 p-1">
          <Knob
            key={`knob-${instrumentMeta.id}-${index}-attack`}
            value={attack}
            onChange={setAttack}
            label="ATTACK"
            defaultValue={0}
            disabled={!isRuntimeLoaded}
            size="sm"
            formatValue={formatAttackLabel}
          />
          <Knob
            key={`knob-${index}-filter`}
            value={filter}
            onChange={setFilter}
            label="TONE"
            scale="split-filter"
            defaultValue={50}
            disabled={!isRuntimeLoaded}
            size="sm"
          />
          <Knob
            key={`knob-${instrumentMeta.id}-${index}-release`}
            value={release}
            onChange={setRelease}
            label="RELEASE"
            defaultValue={100}
            disabled={!isRuntimeLoaded}
            size="sm"
            formatValue={formatReleaseLabel}
          />
          <Knob
            key={`knob-${instrumentMeta.id}-${index}-pitch`}
            value={pitch}
            onChange={setPitch}
            label="PITCH"
            step={PITCH_KNOB_STEP}
            defaultValue={50}
            disabled={!isRuntimeLoaded}
            formatValue={formatPitchLabel}
            size="sm"
          />
        </div>

        {/* Bottom controls */}
        <div className="grid grid-cols-2 p-1">
          {/* Left: Pan + Mute/Solo */}
          <div className="flex flex-col items-center justify-between pt-4">
            <CustomSlider
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
            <div className="flex rounded-lg shadow-[0_2px_4px_var(--color-shadow-60)]">
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
                  {mute ? <ImVolumeMute2 /> : <ImVolumeMute />}
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
                  <MdHeadphones className={cn({ "text-primary": solo })} />
                </Button>
              </Tooltip>
            </div>
          </div>

          {/* Right: Volume */}
          <Knob
            key={`knob-${instrumentMeta.id}-${index}-volume`}
            value={volume}
            onChange={setVolume}
            label="LEVEL"
            units="dB"
            range={INSTRUMENT_VOLUME_RANGE}
            defaultValue={92}
            disabled={!isRuntimeLoaded}
            formatValue={(knobValue) =>
              knobValue <= 0
                ? "-∞ dB"
                : `${transformKnobValue(
                    knobValue,
                    INSTRUMENT_VOLUME_RANGE,
                  ).toFixed(1)} dB`
            }
          />
        </div>
      </div>
    </div>
  );
};
