import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import {
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_RANGE,
} from "@/lib/audio/engine/constants";
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
  const [bpmInputValue, setBpmInputValue] = useState<number>(bpm);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleBpmChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (/^\d+$/.test(value)) {
      const numericValue = parseInt(value, 10);
      if (numericValue >= 0 && numericValue <= MAX_BPM) {
        setBpmInputValue(numericValue);
      }
    }
  };

  // Handle the form submission logic with inputValue when the input loses focus
  const handleBlur = () => {
    setBpm(bpmInputValue);
  };

  const handleMouseDown = (modifier: number) => {
    // Immediate update
    setBpmInputValue((prev) =>
      Math.min(Math.max(prev + modifier, MIN_BPM), MAX_BPM),
    );
    // Start interval for hold
    intervalRef.current = setInterval(() => {
      setBpmInputValue((prev) =>
        Math.min(Math.max(prev + modifier, MIN_BPM), MAX_BPM),
      );
    }, HOLD_INTERVAL);
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
    setBpm(bpmInputValue);
  }, [bpmInputValue, setBpm]);

  useEffect(() => {
    setBpmInputValue(bpm);
  }, [bpm]);

  return (
    <div className="flex flex-col items-center justify-center gap-8">
      <div className="neu-medium-raised relative rounded-lg">
        <div className="surface-raised relative flex w-28 items-center rounded-lg p-2">
          <Input
            ref={inputRef}
            className="w-20 px-2 text-center text-2xl shadow-[inset_0_4px_8px_var(--color-shadow-60)]"
            value={bpmInputValue}
            onChange={handleBpmChange}
            onBlur={handleBlur}
            onFocus={(e) => e.target.select()}
          />
          <div className="text-foreground-muted absolute right-0 flex h-full w-6 flex-col text-xs">
            <button
              className="hover:text-primary-muted flex flex-1 items-center justify-center"
              onMouseDown={() => handleMouseDown(1)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <ChevronUp size={14} />
            </button>
            <button
              className="hover:text-primary-muted flex flex-1 items-center justify-center"
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
      <HardwareSlider
        size={100}
        sliderValue={swing}
        setSliderValue={setSwing}
        title="SWING"
        defaultValue={0}
        transformRange={TRANSPORT_SWING_RANGE}
      />
    </div>
  );
};
