import { Pause, Play } from "lucide-react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { Button, Tooltip } from "@/shared/ui";

export const PlayPauseButton = () => {
  const { instrumentRuntimes } = useDrumhaus();
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  return (
    <div className="flex aspect-square w-full items-center justify-center p-2">
      <Tooltip content={isPlaying ? "Pause [Space]" : "Play [Space]"}>
        <Button
          variant="hardware"
          className="aspect-square h-full w-auto rounded-xl p-3 [&_svg]:size-[50px]!"
          onClick={() => togglePlay(instrumentRuntimes.current)}
          onKeyDown={(ev) => {
            if (ev.key === " " || ev.key === "Enter") {
              ev.preventDefault();
            }
          }}
        >
          <div className="neu-medium-raised flex h-full w-full items-center justify-center rounded-full shadow-[var(--shadow-neu-md),0_0_2px_3px_var(--color-shadow-30)]">
            {isPlaying ? (
              <Pause fill="currentColor" size={50} strokeWidth={1} />
            ) : (
              <Play fill="currentColor" size={50} strokeWidth={1} />
            )}
          </div>
        </Button>
      </Tooltip>
    </div>
  );
};
