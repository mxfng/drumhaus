import { useRef } from "react";
import { Pause, Play } from "lucide-react";

import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { useLightNode } from "@/shared/lightshow";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";

export const PlayPauseButton = () => {
  const { instrumentRuntimes } = useDrumhaus();
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useLightNode(buttonRef, { group: "transport", weight: 1 });

  return (
    <div className="flex items-center justify-center p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            ref={buttonRef}
            variant="hardware"
            className="h-(--app-play-button) w-(--app-play-button) rounded-xl p-1 [&_svg]:size-[50px]!"
            onClick={() => togglePlay(instrumentRuntimes.current)}
            onKeyDown={(ev) => {
              if (ev.key === " " || ev.key === "Enter") {
                ev.preventDefault();
              }
            }}
          >
            <div className="neu-medium-raised flex aspect-square h-(--app-play-button-inner) w-(--app-play-button-inner) items-center justify-center rounded-full shadow-[var(--shadow-neu-md),0_0_2px_3px_var(--color-shadow-30)]">
              {isPlaying ? (
                <Pause fill="currentColor" size={50} strokeWidth={1} />
              ) : (
                <Play fill="currentColor" size={50} strokeWidth={1} />
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isPlaying ? "Pause [Space]" : "Play [Space]"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
