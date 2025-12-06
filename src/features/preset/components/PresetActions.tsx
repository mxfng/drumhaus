import { AudioLines, Import, Save, Share2 } from "lucide-react";

import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { useDialogStore } from "@/shared/store/useDialogStore";
import {
  Button,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useToast,
} from "@/shared/ui";

type PresetActionsProps = {
  onOpenFromFile: () => void;
};

export const PresetActions: React.FC<PresetActionsProps> = ({
  onOpenFromFile,
}) => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const currentPresetMeta = usePresetMetaStore(
    (state) => state.currentPresetMeta,
  );
  const isCustomPreset = usePresetMetaStore((state) => state.isCustomPreset);
  const updateCustomPreset = usePresetMetaStore(
    (state) => state.updateCustomPreset,
  );
  const { toast } = useToast();

  const isCustom = isCustomPreset(currentPresetMeta.id);

  const handleSave = () => {
    if (isCustom) {
      // Custom preset: silent update
      updateCustomPreset(currentPresetMeta.id);
      toast({
        title: "Preset updated",
        description: currentPresetMeta.name,
        duration: 3000,
      });
    } else {
      // Factory preset: Save As dialog
      openDialog("save");
    }
  };

  return (
    <div className="text-screen grid h-full w-full grid-cols-4">
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button onClick={handleSave} variant="screen" size="screen">
            <Save
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isCustom ? "Update preset" : "Save preset"}
        </TooltipContent>
      </Tooltip>

      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button onClick={onOpenFromFile} variant="screen" size="screen">
            <Import
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Import preset from file</TooltipContent>
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
          <Button
            onClick={() => openDialog("share")}
            variant="screen"
            size="screen"
          >
            <Share2
              className="group-hover:text-accent transition-all duration-200"
              size={20}
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Share preset</TooltipContent>
      </Tooltip>
    </div>
  );
};
