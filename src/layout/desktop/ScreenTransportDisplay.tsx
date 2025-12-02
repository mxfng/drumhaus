import {
  TRANSPORT_BPM_RANGE,
  TRANSPORT_SWING_RANGE,
} from "@/core/audio/engine/constants";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { ClickableValue } from "@/shared/components/ClickableValue";

const [MIN_BPM, MAX_BPM] = TRANSPORT_BPM_RANGE;
const [MIN_SWING, MAX_SWING] = TRANSPORT_SWING_RANGE;

export const ScreenTransportDisplay: React.FC = () => {
  const bpm = useTransportStore((state) => state.bpm);
  const setBpm = useTransportStore((state) => state.setBpm);
  const swing = useTransportStore((state) => state.swing);
  const setSwing = useTransportStore((state) => state.setSwing);

  const formatSwing = (value: number) => `${Math.round(value)}%`;
  const parseSwing = (text: string) => parseFloat(text.replace("%", ""));

  return (
    <div className="bg-foreground-emphasis text-instrument flex h-full items-center rounded-tl-full px-2 pt-0.5 pl-4 text-sm">
      <div className="grid w-full grid-cols-4">
        <ClickableValue
          value={bpm}
          onValueChange={setBpm}
          min={MIN_BPM}
          max={MAX_BPM}
          stepSize={1}
          sensitivity={0.3}
          label="bpm"
          labelClassName="text-xs"
        />
        <ClickableValue
          value={swing}
          onValueChange={setSwing}
          min={MIN_SWING}
          max={MAX_SWING}
          stepSize={1}
          formatValue={formatSwing}
          parseValue={parseSwing}
          sensitivity={0.2}
          label="swing"
          labelClassName="text-xs"
        />
        <span className="col-span-2">
          <span className="text-xs">cycle </span>
          <b className="pl-1">ABABCDCD</b>
        </span>
      </div>
    </div>
  );
};
