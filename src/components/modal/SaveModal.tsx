import { useRef, useState } from "react";
import { z } from "zod";

import {
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
  const prevIsOpenRef = useRef(isOpen);

  // Auto-populate with default name when modal opens
  // Using ref comparison during render avoids setState in effect
  if (isOpen && !prevIsOpenRef.current && defaultName) {
    setPresetName(defaultName);
  }
  prevIsOpenRef.current = isOpen;

  // Auto-focus input when modal opens
  if (isOpen && inputRef.current) {
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 100);
  }

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
                className="h-full w-full bg-transparent font-pixel text-text outline-none placeholder:text-text-light"
                placeholder="Preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={handleSave}
            disabled={!presetName.trim()}
            className="rounded-md bg-accent px-4 py-2 font-pixel text-sm text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download
          </button>
          <button
            onClick={handleClose}
            className="rounded-md px-4 py-2 font-pixel text-sm text-text hover:bg-lowlight"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
