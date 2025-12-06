import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui";

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
          <DialogTitle>Desktop Recommended</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 pb-4">
          <DialogDescription>
            Drumhaus works best on desktop browsers. Some features may be
            limited or unavailable on mobile devices.
          </DialogDescription>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Got It</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
