import { FaFolderOpen } from "react-icons/fa";
import { IoIosShareAlt } from "react-icons/io";
import { MdOutlineSaveAlt } from "react-icons/md";
import { RxReset } from "react-icons/rx";

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
            <MdOutlineSaveAlt
              className="group-hover:text-accent transition-all duration-200"
              size="20px"
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
            <FaFolderOpen
              className="group-hover:text-accent transition-all duration-200"
              size="20px"
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
            <IoIosShareAlt
              className="group-hover:text-accent transition-all duration-200"
              size="26px"
            />
          </Button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Reset all" delayDuration={500}>
          <Button
            variant="hardware"
            size="icon"
            onClick={() => openDialog("reset")}
            className="w-full rounded-r-lg"
          >
            <RxReset
              className="group-hover:text-accent transition-all duration-200"
              size="20px"
            />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
};
