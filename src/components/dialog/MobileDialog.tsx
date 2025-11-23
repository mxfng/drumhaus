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

interface MobileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDialog: React.FC<MobileDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Best on Desktop</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="space-y-2 pb-4">
          <DialogDescription>
            Drumhaus is optimized for desktop browsers. Some features may not
            work on mobile devices.
          </DialogDescription>
          <DialogDescription>
            For the best experience, visit on your computer.
          </DialogDescription>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Got It</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
