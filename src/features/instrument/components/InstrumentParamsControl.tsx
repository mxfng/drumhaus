import { useCallback, useEffect } from "react";
import { Headphones, Volume, VolumeX } from "lucide-react";

import type { InstrumentRuntime } from "@/core/audio/engine/instrument/types";
import { useInstrumentControls } from "@/core/audio/hooks/useInstrumentControls";
import { useInstrumentsStore } from "@/features/instrument/store/useInstrumentsStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { HardwareSlider } from "@/shared/components/HardwareSlider";
import { ParamKnob } from "@/shared/knob/Knob";
import {
  instrumentDecayMapping,
  instrumentPanMapping,
  instrumentVolumeMapping,
  splitFilterMapping,
  tuneMapping,
} from "@/shared/knob/lib/mapping";
import { buttonActive } from "@/shared/lib/buttonActive";
import { cn } from "@/shared/lib/utils";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { Button, Tooltip } from "@/shared/ui";
import { GainMeter } from "./GainMeter";

interface InstrumentParamsProps {
  index: number;
  runtime?: InstrumentRuntime;
}

export const InstrumentParamsControl: React.FC<InstrumentParamsProps> = ({
  index,
  runtime,
}) => {
  const isAnyDialogOpen = useDialogStore((state) => state.isAnyDialogOpen);

  // Read params from store
  const decay = useInstrumentsStore(
    (state) => state.instruments[index].params.decay,
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
  const tune = useInstrumentsStore(
    (state) => state.instruments[index].params.tune,
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

  // Get instrument control actions with proper audio cleanup
  const { toggleMute, toggleSolo } = useInstrumentControls(index, runtime);

  const mode = usePatternStore((state) => state.mode);
  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;

  // Wrap store setters with instrument index
  const setDecay = useCallback(
    (value: number) => setInstrumentProperty(index, "decay", value),
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
  const setTune = useCallback(
    (value: number) => setInstrumentProperty(index, "tune", value),
    [index, setInstrumentProperty],
  );

  const isRuntimeLoaded = !!runtime;

  // Keyboard shortcuts
  useEffect(() => {
    const muteOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "m" && !isAnyDialogOpen() && index == voiceIndex) {
        toggleMute();
      }
    };

    window.addEventListener("keydown", muteOnKeyInput);
    return () => {
      window.removeEventListener("keydown", muteOnKeyInput);
    };
  }, [index, voiceIndex, toggleMute, isAnyDialogOpen]);

  useEffect(() => {
    const soloOnKeyInput = (event: KeyboardEvent) => {
      if (event.key === "s" && !isAnyDialogOpen() && index == voiceIndex) {
        toggleSolo();
      }
    };

    window.addEventListener("keydown", soloOnKeyInput);
    return () => {
      window.removeEventListener("keydown", soloOnKeyInput);
    };
  }, [index, voiceIndex, toggleSolo, isAnyDialogOpen]);

  return (
    <div
      className={cn(
        "grid min-h-0 w-full flex-1 grid-cols-2 place-items-center gap-2",
        isRuntimeLoaded ? "opacity-100" : "opacity-50",
      )}
    >
      {/* Top knobs - 2x2 grid */}
      <ParamKnob
        value={decay}
        onValueChange={setDecay}
        label="decay"
        mapping={instrumentDecayMapping}
      />
      <ParamKnob
        value={tune}
        onValueChange={setTune}
        label="tune"
        mapping={tuneMapping}
        outerTickCount={15}
      />
      <ParamKnob
        value={filter}
        onValueChange={setFilter}
        label="filter"
        mapping={splitFilterMapping}
        outerTickCount={3}
      />
      <ParamKnob
        value={pan}
        onValueChange={setPan}
        label="pan"
        mapping={instrumentPanMapping}
        outerTickCount={3}
      />

      {/* Spacer */}
      <div />

      {/* Level/volume slider */}
      <div className="col-span-2 grid h-24 w-5/6 grid-cols-3 place-items-center">
        <GainMeter runtime={runtime} />
        <HardwareSlider
          mapping={instrumentVolumeMapping}
          value={volume}
          onValueChange={setVolume}
          orientation="vertical"
        />
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <Tooltip content={mute ? "Unmute" : "Mute"} side="right">
            <Button
              variant="hardwareIcon"
              size="icon"
              onClick={toggleMute}
              disabled={!isRuntimeLoaded}
              className={buttonActive(mute)}
            >
              {mute ? <VolumeX size={14} /> : <Volume size={14} />}
            </Button>
          </Tooltip>
          <Tooltip content={solo ? "Unsolo" : "Solo"} side="right">
            <Button
              variant="hardwareIcon"
              size="icon"
              onClick={toggleSolo}
              disabled={!isRuntimeLoaded}
              className={buttonActive(solo)}
            >
              <Headphones className={cn({ "text-primary": solo })} size={14} />
            </Button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
