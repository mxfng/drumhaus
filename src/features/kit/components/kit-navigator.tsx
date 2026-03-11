import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";

type KitNavigatorProps = {
  onPrevious: () => void;
  onNext: () => void;
};

export const KitNavigator: React.FC<KitNavigatorProps> = ({
  onPrevious,
  onNext,
}) => {
  return (
    <div className="text-screen grid h-full w-full grid-cols-4">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button onClick={onPrevious} variant="screen" size="screen">
            <ChevronLeft
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Previous kit</TooltipContent>
      </Tooltip>

      <div />
      <div />

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button onClick={onNext} variant="screen" size="screen">
            <ChevronRight
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Next kit</TooltipContent>
      </Tooltip>
    </div>
  );
};
