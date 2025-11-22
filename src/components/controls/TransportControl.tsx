import { useEffect, useRef, useState } from "react";
import { IoTriangleSharp } from "react-icons/io5";

import {
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_RANGE,
} from "@/lib/audio/engine/constants";
import { useTransportStore } from "@/stores/useTransportStore";
import { CustomSlider } from "../common/CustomSlider";

// Constants
const [MIN_BPM, MAX_BPM] = TRANSPORT_BPM_RANGE;
const HOLD_INTERVAL = 130;

export const TransportControl: React.FC = () => {
  // Get transport state from store
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);
  const [bpmInputValue, setBpmInputValue] = useState<number>(bpm);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const upButtonRef = useRef<HTMLButtonElement | null>(null);
  const downButtonRef = useRef<HTMLButtonElement | null>(null);

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

  // Handle mouse hold on BPM buttons
  useEffect(() => {
    const updateBpm = (modifier: number) => {
      setBpmInputValue((prevBpmInputValue) => {
        const newBpmInputValue = Math.min(
          Math.max(prevBpmInputValue + modifier, MIN_BPM),
          MAX_BPM,
        );
        return newBpmInputValue;
      });
    };

    let intervalId: NodeJS.Timeout;
    const upButton = upButtonRef.current;
    const downButton = downButtonRef.current;

    const handleUpButtonMouseDown = () => {
      updateBpm(1);
      intervalId = setInterval(() => updateBpm(1), HOLD_INTERVAL);
    };

    const handleDownButtonMouseDown = () => {
      updateBpm(-1);
      intervalId = setInterval(() => updateBpm(-1), HOLD_INTERVAL);
    };

    const handleMouseUp = () => {
      clearInterval(intervalId);
    };

    if (upButton)
      upButton.addEventListener("mousedown", handleUpButtonMouseDown);
    if (downButton)
      downButton.addEventListener("mousedown", handleDownButtonMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      if (upButton)
        upButton.removeEventListener("mousedown", handleUpButtonMouseDown);
      if (downButton)
        downButton.removeEventListener("mousedown", handleDownButtonMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [setBpm]);

  useEffect(() => {
    setBpm(bpmInputValue);
  }, [bpmInputValue, setBpm]);

  useEffect(() => {
    setBpmInputValue(bpm);
  }, [bpm]);

  return (
    <>
      <div className="relative flex h-full w-[150px] items-center justify-center">
        <div>
          <div className="flex">
            <div className="flex items-center justify-center">
              <div className="neu-extra-tall absolute top-10 h-[70px] w-[150px] rounded-lg p-3">
                <div className="relative z-[3] flex h-full items-center justify-center">
                  <div className="flex h-full">
                    <input
                      ref={inputRef}
                      className="font-pixel text-text absolute left-0 h-full w-[98px] rounded-l-lg border-0 text-center text-[40px] leading-none shadow-[inset_0_4px_8px_var(--color-shadow-60)] outline-none selection:bg-[rgba(255,140,0,0.5)] focus:shadow-[inset_0_4px_8px_var(--color-shadow-60)]"
                      type="number"
                      value={bpmInputValue}
                      onChange={handleBpmChange}
                      onBlur={handleBlur}
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      className="absolute -top-3 -right-3 h-[35px] w-[10px] rounded-tr-lg bg-transparent"
                      ref={upButtonRef}
                    >
                      <IoTriangleSharp className="text-text" />
                    </button>
                    <button
                      className="absolute -right-3 -bottom-3 h-[35px] w-[20px] rounded-br-lg bg-transparent"
                      ref={downButtonRef}
                    >
                      <IoTriangleSharp
                        className="text-text"
                        style={{ transform: "rotate(180deg)" }}
                      />
                    </button>
                  </div>
                  <div className="absolute -bottom-6 -left-1 flex items-center justify-center">
                    <span className="font-pixel text-text -my-3 text-xs">
                      TEMPO
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute bottom-6 left-0">
            <CustomSlider
              size={146}
              sliderValue={swing}
              setSliderValue={setSwing}
              title="SWING"
              defaultValue={0}
              transformRange={TRANSPORT_SWING_RANGE}
            />
          </div>
        </div>
      </div>
    </>
  );
};
