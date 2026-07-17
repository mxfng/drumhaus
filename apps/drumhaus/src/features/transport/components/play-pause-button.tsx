import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@haus/ui";
import { Pause, Play } from "lucide-react";

import { useTransportStore } from "@/features/transport/store/use-transport-store";

const PlayPauseButton = () => {
  const isPlaying = useTransportStore((state) => state.isPlaying);
  const togglePlay = useTransportStore((state) => state.togglePlay);

  return (
    <div className="flex items-center justify-center p-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="hardware"
            aria-label={isPlaying ? "Pause" : "Play"}
            className="h-(--app-play-button) w-(--app-play-button) rounded-xl p-1 [&_svg]:size-[50px]!"
            onClick={() => togglePlay()}
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

export { PlayPauseButton };
