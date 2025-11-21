import {
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desktop Recommended</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="space-y-2 pb-4">
          <DialogDescription>
            {"We're so glad you've decided to give Drumhaus a try!"}
          </DialogDescription>
          <DialogDescription>
            Drumhaus was built and optimized for use on desktop devices. Some
            features may not be available on mobile.
          </DialogDescription>
          <DialogDescription>
            It is recommended that you switch to your desktop device for the
            optimal experience.
          </DialogDescription>
        </div>

        <DialogFooter>
          <button
            onClick={onClose}
            className="rounded-md bg-accent px-4 py-2 font-pixel text-sm text-white hover:bg-accent-hover"
          >
            Dismiss
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
