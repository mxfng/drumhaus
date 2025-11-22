import {
  Button,
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface ConfirmSelectPresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
}

export const ConfirmSelectPresetDialog: React.FC<
  ConfirmSelectPresetDialogProps
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
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSelect}>Switch</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
