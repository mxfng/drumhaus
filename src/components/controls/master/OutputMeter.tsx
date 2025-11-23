import { VerticalMeter } from "@/components/common/VerticalMeter";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

const MIN_OUTPUT_DB = -48;
const MAX_OUTPUT_DB = 0;

export const OutputMeter: React.FC = () => {
  const outputLevel = useMasterChainStore((state) => state.outputLevel);
  const safeLevel = Number.isFinite(outputLevel) ? outputLevel : MIN_OUTPUT_DB;

  const clamped = Math.min(MAX_OUTPUT_DB, Math.max(MIN_OUTPUT_DB, safeLevel));
  const percent =
    ((clamped - MIN_OUTPUT_DB) / (MAX_OUTPUT_DB - MIN_OUTPUT_DB)) * 100;
  const valueText =
    !Number.isFinite(outputLevel) || outputLevel <= MIN_OUTPUT_DB
      ? "-∞ dB"
      : `${outputLevel.toFixed(0)} dB`;

  return (
    <VerticalMeter
      percent={percent}
      tooltip="Post-limiter output level"
      valueText={valueText}
      label="OUTPUT"
      className="w-8 opacity-60"
    />
  );
};
