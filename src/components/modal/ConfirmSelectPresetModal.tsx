import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface ConfirmSelectPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export const ConfirmSelectPresetModal: React.FC<
  ConfirmSelectPresetModalProps
> = ({ isOpen, onClose, onSelect }) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmation</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="space-y-2 pb-4">
          <DialogDescription>
            Are you sure you want to switch to a new preset?
          </DialogDescription>
          <DialogDescription>
            You will lose any unsaved work on the current preset.
          </DialogDescription>
          <DialogDescription>
            {`You can download your work as a .dh file using the 'Download to file' button, or share it with a friend using the 'Share as link' button.`}
          </DialogDescription>
        </div>

        <DialogFooter>
          <button
            onClick={onSelect}
            className="rounded-md bg-accent px-4 py-2 font-pixel text-sm text-white hover:bg-accent-hover"
          >
            Switch
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 font-pixel text-sm text-text hover:bg-lowlight"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
