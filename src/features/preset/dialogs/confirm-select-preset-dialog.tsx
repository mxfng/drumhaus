import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

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
          <DialogTitle>Switch Preset?</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pb-4">
          <DialogDescription>
            Any unsaved changes to your current preset will be lost.
          </DialogDescription>
          <DialogDescription>
            You can save your work to your preset library, or use Export/Share
            to download a file or generate a link.
          </DialogDescription>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSelect}>Switch Anyway</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
