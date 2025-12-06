import { init } from "@/core/dh";
import { useDrumhaus } from "@/core/providers/DrumhausProvider";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from "@/shared/ui";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presetId: string;
  presetName: string;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  onClose,
  presetId,
  presetName,
}) => {
  const { loadPreset } = useDrumhaus();
  const deleteCustomPreset = usePresetMetaStore(
    (state) => state.deleteCustomPreset,
  );
  const currentPresetId = usePresetMetaStore(
    (state) => state.currentPresetMeta.id,
  );
  const { toast } = useToast();

  const handleConfirm = () => {
    // Check if we're deleting the current preset
    const isDeletingCurrent = presetId === currentPresetId;

    // Delete the preset
    deleteCustomPreset(presetId);

    // If deleting current preset, load init preset
    if (isDeletingCurrent) {
      loadPreset(init());
      toast({
        title: "Preset deleted",
        description: "Loaded default preset",
        duration: 3000,
      });
    } else {
      toast({
        title: "Preset deleted",
        description: `"${presetName}" has been removed`,
        duration: 3000,
      });
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Preset?</DialogTitle>
        </DialogHeader>

        <DialogDescription>
          This will permanently delete <strong>"{presetName}"</strong> from
          memory. This action cannot be undone.
        </DialogDescription>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
