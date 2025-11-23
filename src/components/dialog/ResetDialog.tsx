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

interface ResetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
}

export const ResetDialog: React.FC<ResetDialogProps> = ({
  isOpen,
  onClose,
  onReset,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset Everything?</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="pb-4">
          <DialogDescription>
            This will restore all instruments and settings to their defaults.
            Your current work will be lost.
          </DialogDescription>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onReset}>Reset</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
