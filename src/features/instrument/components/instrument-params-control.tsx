import { useCallback, useEffect } from "react";
import { Headphones, Volume, VolumeX } from "lucide-react";

import { useChannelReady } from "@/core/audio/bridge/use-kit-version";
import type { CanonicalFilter } from "@/core/audio/canonical/filter";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { buttonActive } from "@/shared/lib/button-active";
import { cn } from "@/shared/lib/utils";
import {
  instrumentDecayDescriptor,
  instrumentPanDescriptor,
  instrumentTuneDescriptor,
  instrumentVolumeDescriptor,
  LinearSlider,
  RotaryKnob,
  splitFilterDescriptor,
} from "@/shared/param-control";
import { useDialogStore } from "@/shared/store/use-dialog-store";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";
import { GainMeter } from "./gain-meter";

interface InstrumentParamsProps {
  index: number;
}

function InstrumentParamsControl({ index }: InstrumentParamsProps) {
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

  // Mute/solo go straight to the store; the engine detects the transitions
  // in setChannelPlayParams and handles audio cleanup (choke) internally.
  const toggleMuteStore = useInstrumentsStore((state) => state.toggleMute);
  const toggleSoloStore = useInstrumentsStore((state) => state.toggleSolo);
  const toggleMute = useCallback(
    () => toggleMuteStore(index),
    [index, toggleMuteStore],
  );
  const toggleSolo = useCallback(
    () => toggleSoloStore(index),
    [index, toggleSoloStore],
  );

  const mode = usePatternStore((state) => state.mode);
  const voiceIndex = mode.type === "voice" ? mode.voiceIndex : 0;

  // Wrap store setters with instrument index
  const setDecay = useCallback(
    (value: number) => setInstrumentProperty(index, "decay", value),
    [index, setInstrumentProperty],
  );
  const setFilter = useCallback(
    (value: CanonicalFilter) => setInstrumentProperty(index, "filter", value),
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

  // Refreshed on every kit load so readiness reflects the active channels
  const isChannelReady = useChannelReady(index);

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
        isChannelReady ? "opacity-100" : "opacity-50",
      )}
    >
      {/* Top knobs - 2x2 grid */}
      <RotaryKnob
        value={decay}
        onChange={setDecay}
        label="decay"
        descriptor={instrumentDecayDescriptor}
      />
      <RotaryKnob
        value={tune}
        onChange={setTune}
        label="tune"
        descriptor={instrumentTuneDescriptor}
      />
      <RotaryKnob
        value={filter}
        onChange={setFilter}
        label="filter"
        descriptor={splitFilterDescriptor}
      />
      <RotaryKnob
        value={pan}
        onChange={setPan}
        label="pan"
        descriptor={instrumentPanDescriptor}
      />

      {/* Spacer */}
      <div />

      {/* Level/volume slider */}
      <div className="col-span-2 grid h-24 w-5/6 grid-cols-3 place-items-center">
        <GainMeter index={index} />
        <LinearSlider
          descriptor={instrumentVolumeDescriptor}
          value={volume}
          onChange={setVolume}
          label="volume"
          orientation="vertical"
          hideLabel
        />
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="hardware-icon"
                size="icon-sm"
                onClick={toggleMute}
                disabled={!isChannelReady}
                className={buttonActive(mute)}
              >
                {mute ? <VolumeX size={14} /> : <Volume size={14} />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {mute ? "Unmute" : "Mute"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="hardware-icon"
                size="icon-sm"
                onClick={toggleSolo}
                disabled={!isChannelReady}
                className={buttonActive(solo)}
              >
                <Headphones
                  className={cn({ "text-primary": solo })}
                  size={14}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {solo ? "Unsolo" : "Solo"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

export { InstrumentParamsControl };
