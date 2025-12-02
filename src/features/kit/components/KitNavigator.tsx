import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button, Tooltip } from "@/shared/ui";

type KitNavigatorProps = {
  onPrevious: () => void;
  onNext: () => void;
};

export const KitNavigator: React.FC<KitNavigatorProps> = ({
  onPrevious,
  onNext,
}) => {
  return (
    <div className="text-instrument grid h-5 w-full grid-cols-4">
      <div className="flex items-center justify-center">
        <Tooltip content="Previous kit" delayDuration={500}>
          <Button
            onClick={onPrevious}
            size="xs"
            className="h-5 bg-transparent p-0.5"
          >
            <ChevronLeft
              className="group-hover:text-primary-muted transition-all duration-200"
              size={20}
            />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center"></div>

      <div className="flex items-center justify-center"></div>

      <div className="flex items-center justify-center">
        <Tooltip content="Next kit" delayDuration={500}>
          <Button
            onClick={onNext}
            size="xs"
            className="h-5 bg-transparent p-0.5"
          >
            <ChevronRight
              className="group-hover:text-primary-muted transition-all duration-200"
              size={20}
            />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
