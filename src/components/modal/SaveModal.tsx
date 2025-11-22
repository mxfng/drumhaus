import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import {
  Button,
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from "@/components/ui";

// Validation schema for preset names
const presetNameSchema = z
  .string()
  .min(1, "Preset name cannot be empty")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  defaultName?: string;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  defaultName = "",
}) => {
  const [presetName, setPresetName] = useState("");
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen] = useState(isOpen);

  // Auto-populate with default name when modal opens
  if (isOpen && !wasOpen && defaultName) {
    setPresetName(defaultName);
  }
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
  }

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPresetName("");
    onClose();
  };

  const handleSave = () => {
    // Validate preset name
    const validation = presetNameSchema.safeParse(presetName.trim());

    if (!validation.success) {
      toast({
        title: "Invalid preset name",
        description: validation.error.issues[0].message,
        status: "error",
        duration: 3000,
      });
      return;
    }

    onSave(presetName.trim());
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Download</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="pb-6">
          <DialogDescription className="pb-6">
            To download your preset, enter a custom preset name.
          </DialogDescription>

          <div className="h-10 w-4/5 rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
            <div className="flex h-full items-center pl-4">
              <input
                ref={inputRef}
                className="font-pixel placeholder:-light h-full w-full bg-transparent outline-none"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSave} disabled={!presetName.trim()}>
            Download
          </Button>
          <Button variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
