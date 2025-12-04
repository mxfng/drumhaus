import { AudioLines, FolderOpen, Save, Trash } from "lucide-react";

import { ComingSoonTooltipContent } from "@/shared/components/ComingSoonTooltipContent";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { Button, Tooltip } from "@/shared/ui";

type PresetActionsProps = {
  onOpenFromFile: () => void;
};

/**
 * TODO: Remaining features
 *
 * - Collapse export and share buttons into single export modal with tabs for type... Link, file, MIDI
 * - Add a delete preset button for managing custom presets
 */
export const PresetActions: React.FC<PresetActionsProps> = ({
  onOpenFromFile,
}) => {
  const openDialog = useDialogStore((state) => state.openDialog);

  return (
    <div className="text-screen grid h-full w-full grid-cols-4">
      <Tooltip content="Save preset" delayDuration={0}>
        <Button
          onClick={() => openDialog("save")}
          variant="screen"
          size="screen"
        >
          <Save
            className="group-hover:text-primary-muted transition-all duration-200"
            size={20}
          />
        </Button>
      </Tooltip>

      <Tooltip content="Load preset" delayDuration={0}>
        <Button onClick={onOpenFromFile} variant="screen" size="screen">
          <FolderOpen
            className="group-hover:text-primary-muted transition-all duration-200"
            size={20}
          />
        </Button>
      </Tooltip>

      <Tooltip content="Export" delayDuration={0}>
        <Button
          onClick={() => openDialog("export")}
          variant="screen"
          size="screen"
        >
          <AudioLines
            className="group-hover:text-primary-muted transition-all duration-200"
            size={20}
          />
        </Button>
      </Tooltip>

      <Tooltip
        content={<ComingSoonTooltipContent tooltip="Delete custom preset" />}
        delayDuration={0}
      >
        <Button variant="screen" size="screen" className="opacity-50">
          <Trash
            className="group-hover:text-primary-muted transition-all duration-200"
            size={20}
          />
        </Button>
      </Tooltip>
    </div>
  );
};
