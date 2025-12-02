import { Download, FolderOpen, Save, Share2 } from "lucide-react";

import { useDialogStore } from "@/shared/store/useDialogStore";
import { Button, Tooltip } from "@/shared/ui";

type PresetActionsProps = {
  onOpenFromFile: () => void;
};

export const PresetActions: React.FC<PresetActionsProps> = ({
  onOpenFromFile,
}) => {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="text-instrument grid h-5 w-full grid-cols-4">
      <div className="flex items-center justify-center">
        <Tooltip content="Save preset" delayDuration={500}>
          <Button
            onClick={() => openDialog("save")}
            size="xs"
            className="h-5 bg-transparent p-0.5"
          >
            <Save
              className="group-hover:text-primary-muted transition-all duration-200"
              size={20}
            />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Load preset" delayDuration={500}>
          <Button
            onClick={onOpenFromFile}
            size="xs"
            className="h-5 bg-transparent p-0.5"
          >
            <FolderOpen
              className="group-hover:text-primary-muted transition-all duration-200"
              size={20}
            />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Share preset" delayDuration={500}>
          <Button
            onClick={() => openDialog("share")}
            size="xs"
            className="h-5 bg-transparent p-0.5"
          >
            <Share2
              className="group-hover:text-primary-muted transition-all duration-200"
              size={20}
            />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Export" delayDuration={500}>
          <Button
            onClick={() => openDialog("export")}
            size="xs"
            className="h-5 bg-transparent p-0.5"
          >
            <Download
              className="group-hover:text-primary-muted transition-all duration-200"
              size={20}
            />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
