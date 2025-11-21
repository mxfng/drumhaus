import { FaFolderOpen } from "react-icons/fa";
import { IoIosShareAlt } from "react-icons/io";
import { MdOutlineSaveAlt } from "react-icons/md";
import { RxReset } from "react-icons/rx";

import { Tooltip } from "@/components/ui";
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
    <div className="neumorphic mt-2 grid grid-cols-4 rounded-lg">
      <div className="flex items-center justify-center">
        <Tooltip content="Download to file" delayDuration={500}>
          <button
            onClick={openSaveModal}
            className="raised group flex w-full items-center justify-center rounded-l-lg p-2"
          >
            <MdOutlineSaveAlt
              className="text-text transition-all duration-200 group-hover:text-accent"
              size="20px"
            />
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Load from file" delayDuration={500}>
          <button
            onClick={onOpenFromFile}
            className="raised group flex w-full items-center justify-center p-2"
          >
            <FaFolderOpen
              className="text-text transition-all duration-200 group-hover:text-accent"
              size="20px"
            />
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Share as link" delayDuration={500}>
          <button
            onClick={openSharingModal}
            className="raised group flex w-full items-center justify-center p-2"
          >
            <IoIosShareAlt
              className="text-text transition-all duration-200 group-hover:text-accent"
              size="26px"
            />
          </button>
        </Tooltip>
      </div>

      <div className="flex items-center justify-center">
        <Tooltip content="Reset all" delayDuration={500}>
          <button
            onClick={openResetModal}
            className="raised group flex w-full items-center justify-center rounded-r-lg p-2"
          >
            <RxReset
              className="text-text transition-all duration-200 group-hover:text-accent"
              size="20px"
            />
          </button>
        </Tooltip>
      </div>
    </div>
  );
};
