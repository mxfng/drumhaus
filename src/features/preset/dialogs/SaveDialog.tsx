import { useState } from "react";

import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { presetNameSchema } from "@/shared/lib/schemas";
import {
  Button,
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@/shared/ui";

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

export const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const currentPresetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );
  const [editedName, setEditedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presetName = editedName ?? currentPresetName;

  const isValid = presetNameSchema.safeParse(presetName.trim()).success;

  const handleClose = () => {
    setEditedName(null);
    setError(null);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditedName(value);

    // Validate on change
    const result = presetNameSchema.safeParse(value);
    if (!result.success) {
      setError(result.error.issues[0].message);
    } else {
      setError(null);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const result = presetNameSchema.safeParse(presetName.trim());
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }
    onSave(presetName.trim());
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent key={currentPresetName}>
        <DialogHeader>
          <DialogTitle>Save Preset</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <form onSubmit={handleSubmit}>
          <div className="pb-6">
            <DialogDescription className="pb-6">
              Give your preset a name so you can find it later.
            </DialogDescription>

            <Label htmlFor="presetName" className="mb-2 block">
              Preset name
            </Label>
            <Input
              id="presetName"
              value={presetName}
              onChange={handleChange}
              autoFocus
            />
            {error && <p className="text-track-red mt-1 text-sm">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} type="button">
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
