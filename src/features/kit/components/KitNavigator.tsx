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
    <div className="text-screen grid h-full w-full grid-cols-4">
      <Tooltip content="Previous kit" side="bottom" delayDuration={0}>
        <Button onClick={onPrevious} variant="screen" size="screen">
          <ChevronLeft
            className="group-hover:text-primary-muted transition-all duration-200"
            size={20}
          />
        </Button>
      </Tooltip>

      <div />
      <div />

      <Tooltip content="Next kit" side="bottom" delayDuration={0}>
        <Button onClick={onNext} variant="screen" size="screen">
          <ChevronRight
            className="group-hover:text-primary-muted transition-all duration-200"
            size={20}
          />
        </Button>
      </Tooltip>
    </div>
  );
};
