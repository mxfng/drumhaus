import { useRef, useState } from "react";
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
                className="h-full w-full bg-transparent font-pixel text-text outline-none placeholder:text-text-light"
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
            className="flex items-center rounded-md bg-accent px-4 py-2 font-pixel text-sm text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mr-2">Get Link</span>
            {isLoading && (
              <PixelatedSpinner color="white" size={20} pixelSize={2} gap={2} />
            )}
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
                className="w-full select-all truncate px-3 font-pixel text-sm text-text"
              >
                {shareableLink}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-md bg-shadow-10 p-3">
            <p className="mb-1 font-pixel text-xs font-bold text-text">
              Fun Fact
            </p>
            <p className="font-pixel text-xs leading-relaxed text-text">
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
            className="rounded-md bg-accent px-4 py-2 font-pixel text-sm text-white hover:bg-accent-hover"
          >
            {hasCopied ? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 font-pixel text-sm text-text hover:bg-lowlight"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
