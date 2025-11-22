import { FaFolderOpen } from "react-icons/fa";
import { IoIosShareAlt } from "react-icons/io";
import { MdOutlineSaveAlt } from "react-icons/md";
import { RxReset } from "react-icons/rx";

import { Button, Tooltip } from "@/components/ui";
import { useModalStore } from "@/stores/useModalStore";

type PresetActionsProps = {
  onOpenFromFile: () => void;
};

export const PresetActions: React.FC<PresetActionsProps> = ({
  onOpenFromFile,
}) => {
  const openSaveModal = useModalStore((state) => state.openSaveModal);
  const openSharingModal = useModalStore((state) => state.openSharingModal);
  const openResetModal = useModalStore((state) => state.openResetModal);

  return (
    <div className="neu mt-2 grid grid-cols-4 rounded-lg">
      <div className="flex items-center justify-center">
        <Tooltip content="Download to file" delayDuration={500}>
          <Button
            variant="hardware"
            size="icon"
            onClick={openSaveModal}
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
        <Tooltip content="Load from file" delayDuration={500}>
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
        <Tooltip content="Share as link" delayDuration={500}>
          <Button
            variant="hardware"
            size="icon"
            onClick={openSharingModal}
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
            onClick={openResetModal}
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
