import { AudioLines, FolderOpen, Save, Trash } from "lucide-react";

import { ComingSoonTooltipContent } from "@/shared/components/ComingSoonTooltipContent";
import { useDialogStore } from "@/shared/store/useDialogStore";
import { Button, Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui";

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
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => openDialog("save")}
            variant="screen"
            size="screen"
          >
            <Save
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Save preset</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button onClick={onOpenFromFile} variant="screen" size="screen">
            <FolderOpen
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Load preset</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            onClick={() => openDialog("export")}
            variant="screen"
            size="screen"
          >
            <AudioLines
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export</TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button variant="screen" size="screen" className="opacity-50">
            <Trash
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <ComingSoonTooltipContent tooltip="Delete custom preset" />
        </TooltipContent>
      </Tooltip>
    </div>
  );
};
