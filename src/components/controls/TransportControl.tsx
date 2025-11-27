import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_RANGE,
} from "@/lib/audio/engine/constants";
import { clamp } from "@/lib/utils";
import { useTransportStore } from "@/stores/useTransportStore";
import { HardwareSlider } from "../common/HardwareSlider";
import { Input, Label } from "../ui";

// Constants
const [MIN_BPM, MAX_BPM] = TRANSPORT_BPM_RANGE;
const HOLD_INTERVAL = 100;

export const TransportControl: React.FC = () => {
  // Get transport state from store
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);
  const [bpmInputValue, setBpmInputValue] = useState<string>(bpm.toString());
  const inputRef = useRef<HTMLInputElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleBpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Allow empty or numeric values
    if (value === "" || /^\d+$/.test(value)) {
      setBpmInputValue(value);
    }
  };

  const handleSubmit = () => {
    if (bpmInputValue === "") {
      // If empty, revert to current BPM
      setBpmInputValue(bpm.toString());
    } else {
      const numericValue = parseInt(bpmInputValue, 10);
      const clampedValue = clamp(numericValue, MIN_BPM, MAX_BPM);
      setBpm(clampedValue);
      setBpmInputValue(clampedValue.toString());
    }
  };

  // Handle the form submission logic with inputValue when the input loses focus
  const handleBlur = () => {
    handleSubmit();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      handleSubmit();
      inputRef.current?.blur();
    }
  };

  const handleMouseDown = (modifier: number) => {
    const updateBpm = () => {
      const currentValue =
        bpmInputValue === "" ? bpm : parseInt(bpmInputValue, 10);
      const newValue = clamp(currentValue + modifier, MIN_BPM, MAX_BPM);
      setBpm(newValue);
      setBpmInputValue(newValue.toString());
    };

    // Immediate update
    updateBpm();
    // Start interval for hold
    intervalRef.current = setInterval(updateBpm, HOLD_INTERVAL);
  };

  const handleMouseUp = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setBpmInputValue(bpm.toString());
  }, [bpm]);

  return (
    <div className="flex w-full flex-col items-center justify-center gap-16 sm:w-26 sm:gap-8">
      <div className="neu-medium-raised relative rounded-lg">
        <div className="surface-raised relative flex h-20 max-w-48 items-center rounded-lg py-2 pl-2 sm:h-14 sm:w-26">
          <Input
            ref={inputRef}
            className="h-full w-3/4 px-2 text-center text-4xl shadow-[inset_0_4px_8px_var(--color-shadow-60)] sm:text-2xl"
            value={bpmInputValue}
            onChange={handleBpmChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            onFocus={(e) => e.target.select()}
          />
          <div className="flex h-full w-1/4 flex-col items-center justify-center text-xs">
            <button
              className="hover:text-primary-muted flex flex-1 items-start justify-start"
              onMouseDown={() => handleMouseDown(1)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <ChevronUp size={14} />
            </button>
            <button
              className="hover:text-primary-muted flex flex-1 items-end justify-end"
              onMouseDown={() => handleMouseDown(-1)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <ChevronDown size={14} />
            </button>
          </div>
        </div>
        <Label className="absolute -bottom-5 left-3">TEMPO</Label>
      </div>
      <div className="w-full px-1">
        <HardwareSlider
          sliderValue={swing}
          setSliderValue={setSwing}
          title="SWING"
          defaultValue={0}
          transformRange={TRANSPORT_SWING_RANGE}
        />
      </div>
    </div>
  );
};
