/** Sweep of the dial, in degrees: 12 o'clock is 0, matching the value indicator. */
const KNOB_ROTATION_RANGE_DEGREES: [number, number] = [-135, 135];

function getKnobTickRotation(
  tickIndex: number,
  tickCount: number,
  range: [number, number],
) {
  const rangeSize = range[1] - range[0];
  return (tickIndex / (tickCount - 1)) * rangeSize + range[0];
}

interface KnobTicksProps {
  outerTickCount: number;
}

/**
 * The ring of fixed outer tick marks around the knob body. Purely decorative
 * orientation cues; the per-widget count (odd for a centred mark) is passed by
 * each usage, exactly as on the original hardware knob.
 */
function KnobTicks({ outerTickCount }: KnobTicksProps) {
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
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <div className="bg-shadow absolute top-[2%] left-1/2 h-0.5 w-0.5 -translate-x-1/2 rounded-full" />
          </div>
        );
      })}
    </>
  );
}

export { KnobTicks, KNOB_ROTATION_RANGE_DEGREES };
