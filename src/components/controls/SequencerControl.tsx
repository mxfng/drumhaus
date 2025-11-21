import { useState } from "react";
import { BsFillEraserFill } from "react-icons/bs";
import { FaDice } from "react-icons/fa";
import { IoBrushSharp, IoCopySharp } from "react-icons/io5";

import { STEP_COUNT } from "@/lib/audio/engine/constants";
import { usePatternStore } from "@/stores/usePatternStore";

export const SequencerControl: React.FC = () => {
  // Get state from Sequencer Store
  const variation = usePatternStore((state) => state.variation);
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const voiceIndex = usePatternStore((state) => state.voiceIndex);
  const pattern = usePatternStore((state) => state.pattern);
  const currentTriggers = usePatternStore(
    (state) =>
      state.pattern[state.voiceIndex].variations[state.variation].triggers,
  );

  // Get actions from store
  const setVariation = usePatternStore((state) => state.setVariation);
  const setVariationCycle = usePatternStore((state) => state.setVariationCycle);
  const updateSequence = usePatternStore((state) => state.updatePattern);
  const clearSequence = usePatternStore((state) => state.clearPattern);
  const [copiedTriggers, setCopiedTriggers] = useState<boolean[] | undefined>();
  const [copiedVelocities, setCopiedVelocities] = useState<
    number[] | undefined
  >();

  const copySequence = () => {
    setCopiedTriggers(currentTriggers);
    setCopiedVelocities(pattern[voiceIndex].variations[variation].velocities);
  };

  const pasteSequence = () => {
    if (copiedTriggers && copiedVelocities) {
      updateSequence(voiceIndex, variation, copiedTriggers, copiedVelocities);
    }
  };

  const handleClearSequence = () => {
    clearSequence(voiceIndex, variation);
  };

  const handleRandomSequence = () => {
    const randomTriggers: boolean[] = Array.from(
      { length: STEP_COUNT },
      () => Math.random() < 0.5,
    );
    const randomVelocities: number[] = Array.from({ length: STEP_COUNT }, () =>
      Math.random(),
    );
    updateSequence(voiceIndex, variation, randomTriggers, randomVelocities);
  };

  return (
    <>
      <div className="flex h-full w-[280px] items-center justify-center px-4">
        <div>
          <span className="block pb-4 font-pixel text-xs text-text opacity-50">
            SEQUENCER
          </span>
          <div className="grid grid-cols-3 pb-8">
            <div className="relative col-span-1 pr-2">
              <span className="absolute -bottom-3 left-1 -my-3 font-pixel text-xs text-text">
                SHOW
              </span>
              <div className="flex items-center justify-center">
                <div className="neumorphic flex rounded-lg">
                  <button
                    className={`raised h-[30px] w-[30px] rounded-l-lg font-pixel ${
                      variation == 0 ? "text-accent" : "text-text"
                    }`}
                    onClick={() => setVariation(0)}
                  >
                    A
                  </button>
                  <button
                    className={`raised h-[30px] w-[30px] rounded-r-lg font-pixel ${
                      variation == 1 ? "text-accent" : "text-text"
                    }`}
                    onClick={() => setVariation(1)}
                  >
                    B
                  </button>
                </div>
              </div>
            </div>
            <div className="relative col-span-1">
              <span className="absolute -bottom-3 left-1 -my-3 font-pixel text-xs text-text">
                VAR CYC
              </span>
              <div className="flex items-center justify-center">
                <div className="neumorphic flex rounded-lg">
                  <button
                    className={`raised h-[30px] w-[40px] rounded-l-lg font-pixel text-xs ${
                      variationCycle === "A" ? "text-accent" : "text-text"
                    }`}
                    onClick={() => setVariationCycle("A")}
                  >
                    A
                  </button>
                  <button
                    className={`raised h-[30px] w-[40px] font-pixel text-xs ${
                      variationCycle === "B" ? "text-accent" : "text-text"
                    }`}
                    onClick={() => setVariationCycle("B")}
                  >
                    B
                  </button>
                  <button
                    className={`raised h-[30px] w-[40px] font-pixel text-xs ${
                      variationCycle === "AB" ? "text-accent" : "text-text"
                    }`}
                    onClick={() => setVariationCycle("AB")}
                  >
                    AB
                  </button>
                  <button
                    className={`raised h-[30px] w-[40px] rounded-r-lg font-pixel text-xs ${
                      variationCycle === "AAAB" ? "text-accent" : "text-text"
                    }`}
                    onClick={() => setVariationCycle("AAAB")}
                  >
                    AAAB
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 pb-4">
            <div className="relative">
              <button
                className="neumorphicRaised h-[26px] w-full bg-transparent"
                onClick={copySequence}
              >
                <IoCopySharp className="mx-auto text-text" />
              </button>
              <span className="absolute -bottom-3 left-1 -my-3 font-pixel text-xs text-text">
                COPY
              </span>
            </div>
            <div className="relative">
              <button
                className="neumorphicRaised h-[26px] w-full bg-transparent"
                onClick={pasteSequence}
              >
                <IoBrushSharp className="mx-auto text-text" />
              </button>
              <span className="absolute -bottom-3 left-1 -my-3 font-pixel text-xs text-text">
                PASTE
              </span>
            </div>
            <div className="relative">
              <button
                className="neumorphicRaised h-[26px] w-full bg-transparent"
                onClick={handleClearSequence}
              >
                <BsFillEraserFill className="mx-auto text-text" />
              </button>
              <span className="absolute -bottom-3 left-1 -my-3 font-pixel text-xs text-text">
                CLEAR
              </span>
            </div>
            <div className="relative">
              <button
                className="neumorphicRaised h-[26px] w-full bg-transparent"
                onClick={handleRandomSequence}
              >
                <FaDice className="mx-auto text-text" />
              </button>
              <span className="absolute -bottom-3 left-1 -my-3 font-pixel text-xs text-text">
                RAND
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
