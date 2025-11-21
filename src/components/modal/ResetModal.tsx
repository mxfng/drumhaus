import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

export const ResetModal: React.FC<ResetModalProps> = ({
  isOpen,
  onClose,
  onReset,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset All</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="pb-4">
          <DialogDescription>
            Are you sure you want to reset all instruments and audio parameters
            to their initialized settings?
          </DialogDescription>
        </div>

        <DialogFooter>
          <button
            onClick={onReset}
            className="rounded-md bg-accent px-4 py-2 font-pixel text-sm text-white hover:bg-accent-hover"
          >
            Reset
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
