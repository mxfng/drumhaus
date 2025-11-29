import { KNOB_ROTATION_RANGE_DEGREES } from "../lib/constants";

const getKnobTickRotation = (
  tickIndex: number,
  tickCount: number,
  range: [number, number],
) => {
  const rangeSize = range[1] - range[0];
  return (tickIndex / (tickCount - 1)) * rangeSize + range[0];
};

interface KnobTicksProps {
  outerTickCount: number;
}

export function KnobTicks({ outerTickCount }: KnobTicksProps) {
  return (
    <>
      {Array.from({ length: outerTickCount }).map((_, idx) => {
        const rotation = getKnobTickRotation(
          idx,
          outerTickCount,
          KNOB_ROTATION_RANGE_DEGREES,
        );

        return (
          <div
            key={idx}
            className="absolute inset-0 origin-center"
            style={{
              transform: `rotate(${rotation}deg)`,
            }}
          >
            <div className="bg-shadow-60 absolute top-[2%] left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full" />
          </div>
        );
      })}
    </>
  );
}
