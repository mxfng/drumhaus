import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { PixelatedSpinner } from "@/components/common/PixelatedSpinner";
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
import { useClipboard } from "@/hooks/useClipboard";

// Validation schema for preset names
const presetNameSchema = z
  .string()
  .min(1, "Preset name cannot be empty")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

interface SharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (name: string) => Promise<void>;
  defaultName?: string;
}

export const SharingModal: React.FC<SharingModalProps> = ({
  isOpen,
  onClose,
  onShare,
  defaultName = "",
}) => {
  const [presetName, setPresetName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(false);
    onClose();
  };

  const handleShare = async () => {
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

    setIsLoading(true);
    await onShare(presetName.trim());
    setIsLoading(false);
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Preset</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div className="pb-6">
          <DialogDescription className="pb-6">
            Drumhaus can generate a custom link for you to share your presets
            with.
          </DialogDescription>

          <div className="h-10 w-4/5 rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
            <div className="flex h-full items-center pl-4">
              <input
                ref={inputRef}
                className="font-pixel text-text placeholder:text-text-light h-full w-full bg-transparent outline-none"
                placeholder="Enter a custom preset name"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={handleShare}
            disabled={!presetName.trim() || isLoading}
            className="bg-accent font-pixel hover:bg-accent-hover flex items-center rounded-md px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mr-2">Get Link</span>
            {isLoading && (
              <PixelatedSpinner color="white" size={20} pixelSize={2} gap={2} />
            )}
          </button>
          <button
            onClick={handleClose}
            className="font-pixel text-text hover:bg-lowlight rounded-md px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface SharedModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareableLink: string;
}

export const SharedModal: React.FC<SharedModalProps> = ({
  isOpen,
  onClose,
  shareableLink,
}) => {
  const { onCopy, hasCopied } = useClipboard();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shareable Link</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <div>
          <DialogDescription className="pb-6">
            Success! Your preset can be shared using this link:
          </DialogDescription>

          <div className="h-10 w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
            <div className="flex h-full items-center justify-center">
              <button
                onClick={() => onCopy(shareableLink)}
                className="font-pixel text-text w-full truncate px-3 text-sm select-all"
              >
                {shareableLink}
              </button>
            </div>
          </div>

          <div className="bg-shadow-10 mt-4 rounded-md p-3">
            <p className="font-pixel text-text mb-1 text-xs font-bold">
              Fun Fact
            </p>
            <p className="font-pixel text-text text-xs leading-relaxed">
              Your entire preset is packed into this URL, squeezed from 900+
              lines of JSON down to a few hundred characters using DEFLATE (via
              pako), bit-packed triggers, quantized velocities, and a handful of
              custom compression tricks. It&apos;s basically a tiny spacecraft
              carrying your beats through the web.
            </p>
          </div>
        </div>

        <DialogFooter>
          <button
            onClick={() => onCopy(shareableLink)}
            className="bg-accent font-pixel hover:bg-accent-hover rounded-md px-4 py-2 text-sm text-white"
          >
            {hasCopied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={onClose}
            className="font-pixel text-text hover:bg-lowlight rounded-md px-4 py-2 text-sm"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
