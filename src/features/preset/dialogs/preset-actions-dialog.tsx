import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

interface PresetActionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const PresetActionsDialog: React.FC<PresetActionsDialogProps> = ({
  isOpen,
  onClose,
  presetName,
  onRename,
  onDuplicate,
  onDelete,
}) => {
  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Preset</DialogTitle>
          <DialogDescription>
            What would you like to do with "{presetName}"?
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            variant="secondary"
            onClick={() => handleAction(onRename)}
            className="w-full"
          >
            Rename
          </Button>
          <Button
            variant="secondary"
            onClick={() => handleAction(onDuplicate)}
            className="w-full"
          >
            Duplicate
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction(onDelete)}
            className="w-full"
          >
            Delete
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
