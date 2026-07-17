import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/design/ui";

import type { PendingPresetLoadSource } from "@/features/preset/store/use-pending-preset-load-store";

/**
 * Copy per guarded ingress (use-pending-preset-load-store.ts); the warning
 * body is shared, only the framing changes.
 */
const DIALOG_COPY: Record<
  PendingPresetLoadSource,
  { title: string; confirm: string }
> = {
  library: { title: "Switch Preset?", confirm: "Switch Anyway" },
  file: { title: "Import Preset?", confirm: "Import Anyway" },
  shareLink: { title: "Load Shared Preset?", confirm: "Load Anyway" },
};

interface ConfirmSelectPresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: () => void;
  /** Which ingress staged the load; defaults to the library switch copy. */
  source?: PendingPresetLoadSource;
}

function ConfirmSelectPresetDialog({
  isOpen,
  onClose,
  onSelect,
  source = "library",
}: ConfirmSelectPresetDialogProps) {
  const copy = DIALOG_COPY[source];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
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
          <Button onClick={onSelect}>{copy.confirm}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmSelectPresetDialog };
