import { Download, FolderOpen, Save, Share2 } from "lucide-react";

import { Button, Tooltip } from "@/components/ui";
import { useDialogStore } from "@/stores/useDialogStore";

type PresetActionsProps = {
  onOpenFromFile: () => void;
};

export const PresetActions: React.FC<PresetActionsProps> = ({
  onOpenFromFile,
}) => {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="hardware-button-group mt-2 grid grid-cols-4 rounded-lg">
      <div className="flex items-center justify-center">
        <Tooltip content="Save preset" delayDuration={500}>
          <Button
            variant="hardware"
            size="icon"
            onClick={() => openDialog("save")}
            className="w-full rounded-l-lg"
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
            variant="hardware"
            size="icon"
            onClick={onOpenFromFile}
            className="w-full"
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
            variant="hardware"
            size="icon"
            onClick={() => openDialog("share")}
            className="w-full"
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
            variant="hardware"
            size="icon"
            onClick={() => openDialog("export")}
            className="w-full rounded-r-lg"
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
