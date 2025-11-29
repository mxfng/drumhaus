import { useCallback, useEffect } from "react";
import { Headphones, Volume, VolumeX } from "lucide-react";
import { now } from "tone/build/esm/index";

import { INSTRUMENT_PAN_RANGE } from "@/core/audio/engine/constants";
import { stopRuntimeAtTime } from "@/core/audio/engine/runtimeStops";
import { HardwareSlider } from "@/shared/components/HardwareSlider";
import ParamKnob from "@/shared/components/Knob";
import {
  instrumentAttackMapping,
  instrumentReleaseMapping,
  instrumentVolumeMapping,
  pitchMapping,
  splitFilterMapping,
} from "@/shared/lib/knob/mapping";
import { cn } from "@/shared/lib/utils";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { Button, Tooltip } from "@/shared/ui";
import { useInstrumentsStore } from "../store/useInstrumentsStore";
import { InstrumentRuntime } from "../types/instrument";

interface InstrumentParamsProps {
  index: number;
  instrumentIndex: number;
  mobile?: boolean;
  runtime?: InstrumentRuntime;
}

export const InstrumentParamsControl: React.FC<InstrumentParamsProps> = ({
  index,
  instrumentIndex,
  mobile = false,
  runtime,
}) => {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);

  // Read params from store
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

  // Get store actions
  const setInstrumentProperty = useInstrumentsStore(
    (state) => state.setInstrumentProperty,
  );
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);

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

  const handleToggleMute = useCallback(() => {
    if (!mute && runtime?.samplerNode) {
      stopRuntimeAtTime(runtime, now());
    }
    toggleMute();
  }, [toggleMute, mute, runtime]);

  const isRuntimeLoaded = !!runtime;

  // Keyboard shortcuts
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
        "grid w-full grid-cols-2 place-items-center",
        isRuntimeLoaded ? "opacity-100" : "opacity-50",
        {
          "min-h-0 flex-1": mobile,
          "h-full": !mobile,
        },
      )}
    >
      {/* Top knobs - 2x2 grid */}
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
      <div className="grid w-full grid-cols-2 place-items-center gap-6 sm:gap-4">
        <div className="col-span-2 w-full px-3">
          <HardwareSlider
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
        </div>
        <div className="col-span-2 flex w-full items-center justify-center px-3">
          <div className="hardware-button-group grid w-full grid-cols-2 rounded-lg">
            <Tooltip content="Mute [M]" delayDuration={500}>
              <Button
                variant="hardware"
                size="sm"
                className={cn("rounded-l-lg rounded-r-none p-2", {
                  "text-primary": mute,
                })}
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
                className={cn("rounded-l-none rounded-r-lg p-2", {
                  "text-primary": solo,
                })}
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
  );
};
