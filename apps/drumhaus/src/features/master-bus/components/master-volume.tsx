import { RotaryKnob } from "@haus/param-control";

import { useMasterChainStore } from "@/features/master-bus/store/use-master-chain-store";
import { historyGestureHandlers } from "@/features/preset/history/history";
import { masterVolumeDescriptor } from "@/shared/param-control/descriptors/canonical-scalars";

function MasterVolume() {
  const masterVolume = useMasterChainStore((state) => state.masterVolume);
  const setMasterVolume = useMasterChainStore((state) => state.setMasterVolume);

  return (
    <RotaryKnob
      {...historyGestureHandlers}
      descriptor={masterVolumeDescriptor}
      value={masterVolume}
      onChange={setMasterVolume}
      label="output level"
      size="lg"
      outerTickCount={13}
    />
  );
}

export { MasterVolume };
