import { VerticalMeter } from "@/components/common/VerticalMeter";
import { useMasterChainStore } from "@/stores/useMasterChainStore";

const MAX_REDUCTION_DB = 20; // Maximum gain reduction (absolute) to display

export const GainReductionMeter: React.FC = () => {
  const reduction = useMasterChainStore((state) => state.reduction);

  const percentage = Math.min(
    100,
    Math.max(0, (Math.abs(reduction) / MAX_REDUCTION_DB) * 100),
  );
  const valueText = reduction < -0.1 ? `${reduction.toFixed(0)} dB` : "0 dB";

  return (
    <VerticalMeter
      percent={percentage}
      direction="down"
      tooltip="Gain reduction in dB"
      valueText={valueText}
      className="opacity-60"
    />
  );
};
